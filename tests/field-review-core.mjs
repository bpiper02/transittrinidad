import assert from 'node:assert/strict';
import {buildFieldReviewSubmission,resolveReviewedStopIds} from '../src/field-review-core.mjs';
import {buildAssociationCandidates,validateAssociationSubmission} from '../src/association-import-core.mjs';

const nodes=[
  {id:'a',name:'Alpha',kind:'stand',location:{lat:10.1,lng:-61.1}},
  {id:'b',name:'Bravo',kind:'stop_zone',location:{lat:10.2,lng:-61.2}},
  {id:'c',name:'Charlie',kind:'stand',location:{lat:10.3,lng:-61.3}}
];
const service={
  id:'maxi-a-c',corridorId:'maxi-a-c',mode:'maxi',operator:'Route 3 Maxi taxis',
  originNodeId:'a',destinationNodeId:'c',stopNodeIds:['a','c'],serviceConfidence:'reported_service',
  geometryConfidence:'endpoints_only',geometry:null,fareTTD:8,fareConfidence:'community_verified',scheduleConfidence:'unknown',
  maxiRouteArea:3,bandColor:'green',patternType:'local',boardingPolicy:'fixed_only',alightingPolicy:'fixed_only'
};

assert.deepEqual(resolveReviewedStopIds('Alpha\nBravo\nCharlie',nodes),['a','b','c']);
assert.deepEqual(resolveReviewedStopIds('a\nb\nc',nodes),['a','b','c']);
assert.throws(()=>resolveReviewedStopIds('Alpha\nUnknown',nodes),/not a known network point/);
assert.throws(()=>resolveReviewedStopIds('Alpha\nAlpha',nodes),/duplicate/);

const submission=buildFieldReviewSubmission({
  service,nodes,
  review:{
    accuracy:'needs_correction',association:'Route 3 Maxi Association',reviewerName:'Field rep',reviewerRole:'Driver',receivedAt:'2026-09-12',
    stopNodeIds:['a','b','c'],fareTTD:'10',patternType:'local',boardingPolicy:'corridor_hail',alightingPolicy:'corridor_request',notes:'Bravo is served along the road.'
  }
});
assert.equal(validateAssociationSubmission(submission),true);
assert.equal(submission.routes[0].origin.nodeId,'a');
assert.equal(submission.routes[0].stops[0].nodeId,'b');
assert.equal(submission.routes[0].destination.nodeId,'c');
assert.equal(submission.routes[0].fareTTD,10);
assert.equal(submission.routes[0].boardingPolicy,'corridor_hail');
assert.equal(submission.routes[0].alightingPolicy,'corridor_request');
assert.equal(submission.routes[0].fieldReview.serviceId,'maxi-a-c');

const [candidate]=buildAssociationCandidates(submission,{nodes,services:[service]});
assert.equal(candidate.changeSet.serviceAction,'update_existing');
assert.deepEqual(candidate.changeSet.proposedService.stopNodeIds,['a','b','c']);
assert.equal(candidate.changeSet.proposedService.boardingPolicy,'corridor_hail');
assert.equal(candidate.changeSet.proposedService.alightingPolicy,'corridor_request');
assert.equal(candidate.changeSet.proposedService.fareTTD,10);

const correct=buildFieldReviewSubmission({service,nodes,review:{accuracy:'correct',association:'Driver review',receivedAt:'2026-09-12'}});
assert.deepEqual(correct.routes[0].stops,[]);
assert.equal(correct.routes[0].fareTTD,8);
assert.equal(correct.routes[0].fieldReview.accuracy,'correct');
assert.throws(()=>buildFieldReviewSubmission({service,nodes,review:{association:'Driver review'}}),/choose whether/);

console.log('field review core tests passed');
