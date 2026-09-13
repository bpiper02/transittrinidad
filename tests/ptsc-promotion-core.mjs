import assert from 'node:assert/strict';
import {normalizePTSCServiceDays,promotePTSCReview} from '../src/ptsc-promotion-core.mjs';

assert.deepEqual(normalizePTSCServiceDays(['Monday - Friday']),['mon','tue','wed','thu','fri']);
assert.deepEqual(normalizePTSCServiceDays(['Saturday']),['sat']);
const candidate={officialId:'ptsc-card-42',title:'A/B',url:'https://ptsc.co.tt/routes/a-b/',originNodeId:'a',destinationNodeId:'b',serviceDays:['Monday - Friday'],fareTTD:4,status:'ready_for_service_review',blockers:[]};
const result=promotePTSCReview({
  review:{source:{checkedAt:'2026-09-13'},candidates:[candidate,{...candidate,officialId:'ptsc-card-43',status:'needs_endpoint_mapping',blockers:['origin_node_unresolved']}]},
  snapshot:{records:[]},services:[],schedules:[],fares:[]
});
assert.equal(result.services.length,1);
assert.equal(result.services[0].id,'ptsc-official-42');
assert.equal(result.schedules[0].status,'times_unavailable');
assert.deepEqual(result.schedules[0].serviceDays,['mon','tue','wed','thu','fri']);
assert.equal(result.fares[0].minTTD,4);
assert.equal(result.report.blocked.length,1);
console.log('PTSC promotion core tests passed');
