import assert from 'node:assert/strict';
import {approximateStopZone,buildStudioCandidate,classifyDuplicate,validateRouteDraft} from '../src/route-studio-core.mjs';

const services=[{id:'maxi-a-b',corridorId:'maxi-a-b',mode:'maxi',originNodeId:'a',destinationNodeId:'b'}];
const base={submissionId:'studio-2026-09-19-a-b',receivedAt:'2026-09-19',association:'Route Association',mode:'maxi',originNodeId:'a',destinationNodeId:'b',stopNodeIds:['a','b'],fareTTD:'',evidence:{confirmsReverse:false}};
assert.deepEqual(classifyDuplicate(base,services),{kind:'exact',serviceId:'maxi-a-b',reason:'same directional endpoints and mode'});
assert.equal(classifyDuplicate({...base,originNodeId:'b',destinationNodeId:'a',stopNodeIds:['b','a']},services).kind,'probable');
assert.equal(classifyDuplicate({...base,originNodeId:'c',destinationNodeId:'d',stopNodeIds:['c','d']},services).kind,'new');
assert.equal(validateRouteDraft(base,{services}).fareTTD,null);
const node=approximateStopZone({name:'Village junction',lat:10.2,lng:-61.3,submissionId:base.submissionId,checkedAt:base.receivedAt});
assert.equal(node.kind,'stop_zone');assert.equal(node.locationConfidence,'approximate_area');
const reverse=buildStudioCandidate({...base,originNodeId:'b',destinationNodeId:'a',stopNodeIds:['b','a']},{services});
assert.equal(reverse.candidates[0].changeSet.proposedService.serviceConfidence,'reported_service');
assert.equal(reverse.candidates[0].reverseDraft.confirmedByEvidence,false);
const confirmed=buildStudioCandidate({...base,originNodeId:'b',destinationNodeId:'a',stopNodeIds:['b','a'],evidence:{confirmsReverse:true},serviceConfidence:'community_verified'},{services});
assert.equal(confirmed.candidates[0].changeSet.proposedService.serviceConfidence,'community_verified');
assert.throws(()=>validateRouteDraft({...base,fareTTD:'-2'},{services}),/non-negative/);
console.log('route studio core tests passed');
