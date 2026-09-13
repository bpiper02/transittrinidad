import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const readJson=path=>readFile(new URL(path,import.meta.url),'utf8').then(JSON.parse);
const [review,report,services,schedules,fares]=await Promise.all([
  readJson('../data/source/ptsc-route-review-2026-09-13.json'),readJson('../data/source/ptsc-promotion-2026-09-13.json'),
  readJson('../data/services.json'),readJson('../data/schedules.json'),readJson('../data/fares.json')
]);
const serviceIds=new Set(services.map(item=>item.id));
const promoted=review.candidates.filter(item=>item.status==='ready_for_service_review');
const represented=review.candidates.filter(item=>item.status==='already_represented');
const blocked=review.candidates.filter(item=>item.status==='needs_endpoint_mapping');

assert.equal(review.total,117);
assert.equal(promoted.length,3);
assert.equal(represented.length,72);
assert.equal(blocked.length,42);
assert.equal(report.promoted.length,promoted.length);
assert.equal(report.upgraded.length,represented.length);
assert.equal(report.blocked.length,blocked.length);
for(const officialId of ['ptsc-card-8226','ptsc-card-2441','ptsc-card-2447']){
  const candidate=review.candidates.find(item=>item.officialId===officialId);
  assert.ok(candidate,`missing reviewed PTSC record ${officialId}`);
  assert.equal(candidate.status,'ready_for_service_review',`${officialId} should be promotable after mapped endpoint reconciliation`);
  assert.ok(candidate.originNodeId&&candidate.destinationNodeId,`${officialId} should have both mapped endpoints`);
}
for(const candidate of promoted){
  const id=`ptsc-official-${candidate.officialId.replace('ptsc-card-','')}`;
  assert.ok(serviceIds.has(id),`missing promoted PTSC service ${id}`);
  assert.ok(schedules.some(item=>item.serviceId===id),`missing service-day record for ${id}`);
  if(candidate.fareTTD!=null)assert.ok(fares.some(item=>item.serviceId===id&&item.minTTD===candidate.fareTTD&&item.maxTTD===candidate.fareTTD),`missing official fare for ${id}`);
}
for(const candidate of represented)assert.ok(serviceIds.has(candidate.existingServiceId),`missing upgraded service ${candidate.existingServiceId}`);
for(const candidate of blocked)assert.equal(services.some(item=>item.officialRecordId===candidate.officialId),false,`blocked route ${candidate.officialId} must remain unroutable`);
console.log(`PTSC production reconciliation passed: ${promoted.length} promoted · ${represented.length} upgraded · ${blocked.length} blocked`);
