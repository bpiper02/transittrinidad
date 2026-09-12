import assert from 'node:assert/strict';
import {chooseJourneyOptions} from '../src/routing-core.mjs';

const nodes=new Map([
  ['a',{id:'a',name:'Origin stand',kind:'stand',location:{lat:10.03,lng:-61}}],
  ['b',{id:'b',name:'Destination stand',kind:'stand',location:{lat:10.07,lng:-61}}]
]);
const services=[{
  id:'a-to-b',corridorId:'a-b',mode:'route_taxi',originNodeId:'a',destinationNodeId:'b',
  stopNodeIds:['a','b'],estimatedMinutes:12,serviceConfidence:'verified_service'
}];

const strictDestination=chooseJourneyOptions({
  fromPlace:{name:'Origin area',lat:10.00,lng:-61,routingRadiusKm:5},
  toPlace:{name:'Destination area',lat:10.10,lng:-61,routingRadiusKm:1},
  nodes,services,maxAccessKm:20,candidateLimit:4
});
assert.equal(strictDestination.length,0,'a broad origin radius must not loosen a tight destination egress radius');

const broadBoth=chooseJourneyOptions({
  fromPlace:{name:'Origin area',lat:10.00,lng:-61,routingRadiusKm:5},
  toPlace:{name:'Destination area',lat:10.10,lng:-61,routingRadiusKm:5},
  nodes,services,maxAccessKm:20,candidateLimit:4
});
assert.equal(broadBoth.length,1,'the same route should become eligible when the destination place explicitly allows the wider radius');
assert.equal(broadBoth[0].fromNear.node.id,'a');
assert.equal(broadBoth[0].toNear.node.id,'b');

console.log('independent access/egress radius tests passed');
