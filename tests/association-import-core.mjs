import assert from 'node:assert/strict';
import {buildAssociationCandidates,validateAssociationSubmission} from '../src/association-import-core.mjs';

const nodes=[
  {id:'couva',name:'Couva central pickup area',location:{lat:10.4223,lng:-61.4587}},
  {id:'chag',name:'Chaguanas Maxi hub area',location:{lat:10.5136,lng:-61.4093}}
];
const services=[{
  id:'maxi-couva-chag',corridorId:'maxi-couva-chag',mode:'maxi',originNodeId:'couva',destinationNodeId:'chag',
  stopNodeIds:['couva','chag'],serviceConfidence:'reported_service',geometryConfidence:'endpoints_only',geometry:null,
  fareTTD:null,fareConfidence:'unknown',scheduleConfidence:'unknown'
}];

const submission={
  id:'assoc-001',association:'Route 3 Maxi Association',receivedAt:'2026-09-12',
  contact:{name:'Rep',role:'Coordinator',channel:'phone'},
  routes:[{
    name:'Couva to Chaguanas',mode:'maxi',maxiRouteArea:3,bandColor:'green',
    origin:{name:'Couva central pickup area'},destination:{name:'Chaguanas Maxi hub area'},
    fareTTD:10,
    operation:{days:['Monday','Tuesday','Wednesday','Thursday','Friday'],firstService:'05:30',lastService:'21:00',headwayMinutes:{min:5,max:15}}
  }]
};

assert.equal(validateAssociationSubmission(submission),true);
const [candidate]=buildAssociationCandidates(submission,{nodes,services});
assert.equal(candidate.reviewStatus,'existing_service_upgrade_review');
assert.equal(candidate.changeSet.serviceAction,'update_existing');
assert.equal(candidate.changeSet.existingServiceId,'maxi-couva-chag');
assert.equal(candidate.changeSet.proposedService.fareTTD,10);
assert.equal(candidate.changeSet.proposedService.fareConfidence,'community_verified');
assert.equal(candidate.changeSet.proposedService.serviceConfidence,'community_verified');
assert.equal(candidate.operation.firstService,'05:30');
assert.deepEqual(candidate.operation.days,['mon','tue','wed','thu','fri']);
assert.equal(candidate.operation.canonicalSchedule,null,'service windows/headways are not fabricated into exact departures');
assert.match(candidate.operation.canonicalAvailability.note,/Reported headway 5–15 minutes/);
assert.equal(candidate.changeSet.nodesToCreate.length,0);

const newStandSubmission={
  id:'assoc-002',association:'Local Taxi Association',receivedAt:'2026-09-12',
  routes:[{
    mode:'route_taxi',
    origin:{name:'New Origin Stand',location:{lat:10.4,lng:-61.4}},
    destination:{name:'New Destination Stand',location:{lat:10.45,lng:-61.42}},
    operation:{days:['sat'],departureTimes:['07:00','08:30']}
  }]
};
const [newCandidate]=buildAssociationCandidates(newStandSubmission,{nodes,services});
assert.equal(newCandidate.reviewStatus,'new_nodes_and_service_review');
assert.equal(newCandidate.changeSet.nodesToCreate.length,2);
assert.equal(newCandidate.changeSet.serviceAction,'create_new');
assert.deepEqual(newCandidate.changeSet.proposedSchedule.departureTimes,['07:00','08:30']);
assert.equal(newCandidate.changeSet.proposedSchedule.confidence,'community_verified');

const unmapped={
  id:'assoc-003',association:'Local Taxi Association',receivedAt:'2026-09-12',
  routes:[{mode:'route_taxi',origin:{name:'Mystery Stand'},destination:{name:'Chaguanas Maxi hub area'}}]
};
const [unmappedCandidate]=buildAssociationCandidates(unmapped,{nodes,services});
assert.equal(unmappedCandidate.reviewStatus,'needs_endpoint_mapping');
assert.equal(unmappedCandidate.changeSet.serviceAction,'none');
assert.equal(unmappedCandidate.changeSet.proposedService,null);

assert.throws(()=>validateAssociationSubmission({...submission,routes:[]}),/at least one route/);
assert.throws(()=>validateAssociationSubmission({...submission,routes:[{...submission.routes[0],mode:'spaceship'}]}),/invalid mode/);
assert.throws(()=>validateAssociationSubmission({...submission,routes:[{...submission.routes[0],fareTTD:-1}]}),/fareTTD/);

console.log('association import core tests passed');
