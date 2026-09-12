import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildNetworkQA} from '../src/network-qa-core.mjs';

const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const [nodes,services,transfers,schedules,places,golden]=await Promise.all([
  readJson('../data/nodes.json'),readJson('../data/services.json'),readJson('../data/transfers.json'),readJson('../data/schedules.json'),readJson('../data/places.json'),readJson('../data/golden-journeys.json')
]);
const report=buildNetworkQA({nodes,services,transfers,schedules,places});

assert.ok(golden.length>=30,`pilot gate requires at least 30 golden journeys; found ${golden.length}`);
assert.equal(report.summary.disconnectedPlaces,0,'pilot gate requires every tracked place to reach at least one routable node');
assert.equal(report.issues.filter(issue=>issue.type==='node_missing_location').length,0,'pilot gate requires coordinates for every canonical transport node');

const byId=new Map(services.map(service=>[service.id,service]));
const centralSouth=byId.get('maxi-chag-san-fernando-out');
assert.ok(centralSouth,'pilot gate requires the promoted Central–South local pattern');
assert.equal(centralSouth.patternType,'local');
assert.equal(centralSouth.boardingPolicy,'corridor_hail');
assert.equal(centralSouth.alightingPolicy,'corridor_request');
for(const nodeId of ['chase-village-area','maxi-couva','california-area','claxton-bay-area','marabella-area'])assert.ok(centralSouth.stopNodeIds.includes(nodeId),`Central–South pilot pattern missing ${nodeId}`);

const eastOut=byId.get('maxi-pos-arima-out');
const eastBack=byId.get('maxi-arima-pos-back');
assert.ok(eastOut&&eastBack,'pilot gate requires separately modeled East-corridor directions');
assert.notDeepEqual(eastOut.stopNodeIds,eastBack.stopNodeIds,'East directions must remain separate patterns');

const southwest=services.filter(service=>/point-fortin/i.test(service.id)&&service.serviceConfidence!=='needs_review');
for(const service of southwest){
  assert.equal((service.stopNodeIds||[]).includes('la-brea-area'),false,`${service.id} must not silently absorb La Brea`);
}

const northside=services.filter(service=>service.id.includes('lanse-fourmi'));
const windward=services.filter(service=>service.id.includes('charlotteville'));
assert.ok(northside.length&&windward.length,'pilot gate requires separate Tobago Northside and Windward families');
for(const service of northside)assert.equal((service.stopNodeIds||[]).some(id=>/roxborough|speyside|charlotteville/.test(id)),false,`${service.id} crosses into Windward family`);

const held=services.filter(service=>service.serviceConfidence==='needs_review');
assert.ok(held.every(service=>service.id),'held research leads must remain explicit records rather than disappearing into routing');

const fieldReviewHtml=await readFile(new URL('../public/field-review.html',import.meta.url),'utf8');
const fieldReviewJs=await readFile(new URL('../public/field-review.js',import.meta.url),'utf8');
assert.match(fieldReviewHtml,/does not change the public map/i,'field review must disclose that it cannot publish directly');
assert.match(fieldReviewJs,/buildFieldReviewSubmission/,'field review UI must export through the reviewed intake builder');
assert.match(fieldReviewJs,/resolveReviewedStopIds/,'field review UI must validate ordered route points before export');

console.log(`pilot readiness gate passed: ${golden.length} golden journeys · ${report.summary.routableServices} routable services · ${report.summary.disconnectedPlaces} disconnected places`);
