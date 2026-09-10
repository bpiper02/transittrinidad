import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseConnectedJourney,findJourney,nearestNodes,journeyMinutes} from '../src/routing-core.mjs';

const nodesArray=JSON.parse(await readFile(new URL('../data/nodes.json',import.meta.url)));
const services=JSON.parse(await readFile(new URL('../data/services.json',import.meta.url)));
const nodes=new Map(nodesArray.map(node=>[node.id,node]));

assert.ok(findJourney('ptsc-chaguanas','ptsc-pos-transit-centre',services,nodes),'PTSC Chaguanas must connect to PTSC Port of Spain');
assert.deepEqual(findJourney('ptsc-chaguanas','ptsc-chaguanas',services,nodes),[],'same-node journey should need no transit legs');
assert.equal(findJourney('ptsc-chaguanas','missing-node',services,nodes),null,'disconnected destination should return null');

const portOfSpain={lat:10.6500,lng:-61.5140};
const nearestToPos=nearestNodes(portOfSpain,nodes,{limit:1})[0];
assert.notEqual(nearestToPos.node.id,'ptsc-pos-transit-centre','fixture must reproduce the bug: geographically nearest POS node is not PTSC');

const couva={lat:10.422,lng:-61.462};
const journey=chooseConnectedJourney({fromPlace:couva,toPlace:portOfSpain,nodes,services,candidateLimit:6});
assert.ok(journey,'Couva to Port of Spain should find a connected nearby-node journey');
assert.equal(journey.toNear.node.id,'ptsc-pos-transit-centre','route-aware snapping should choose the connected PTSC destination node');
assert.ok(journey.legs.length>=1,'connected journey should include transit');
assert.ok(Number.isFinite(journey.estimatedMinutes)&&journey.estimatedMinutes>0,'journey should expose a rough time estimate for ranking');

const oneWayNodes=new Map([
  ['a',{id:'a',location:{lat:10,lng:-61}}],
  ['b',{id:'b',location:{lat:10.1,lng:-61}}]
]);
const oneWay=[{id:'one-way',mode:'ptsc',originNodeId:'a',destinationNodeId:'b',bidirectional:false}];
assert.ok(findJourney('a','b',oneWay,oneWayNodes),'one-way service should work in its declared direction');
assert.equal(findJourney('b','a',oneWay,oneWayNodes),null,'one-way service must not be silently reversed');

const weightedNodes=new Map([
  ['a',{id:'a',location:{lat:10.00,lng:-61.00}}],
  ['b',{id:'b',location:{lat:10.02,lng:-61.00}}],
  ['c',{id:'c',location:{lat:10.04,lng:-61.00}}],
  ['d',{id:'d',location:{lat:10.06,lng:-61.00}}],
  ['far',{id:'far',location:{lat:10.90,lng:-61.00}}]
]);
const weightedServices=[
  {id:'long-direct',mode:'ptsc',originNodeId:'a',destinationNodeId:'d',estimatedMinutes:90},
  {id:'short-1',mode:'ptsc',originNodeId:'a',destinationNodeId:'b',estimatedMinutes:8},
  {id:'short-2',mode:'ptsc',originNodeId:'b',destinationNodeId:'c',estimatedMinutes:8},
  {id:'short-3',mode:'ptsc',originNodeId:'c',destinationNodeId:'d',estimatedMinutes:8}
];
const weighted=findJourney('a','d',weightedServices,weightedNodes,{transferPenaltyMinutes:5});
assert.deepEqual(weighted.map(leg=>leg.service.id),['short-1','short-2','short-3'],'weighted routing should prefer a much faster multi-leg path over a slow direct service');
assert.ok(journeyMinutes(weighted,weightedNodes,{transferPenaltyMinutes:5})<90,'weighted path estimate should beat the long direct trip');
assert.equal(nearestNodes({lat:10,lng:-61},weightedNodes,{limit:10,maxKm:20}).some(item=>item.node.id==='far'),false,'access radius should exclude absurdly distant snap nodes');

console.log(`routing core tests passed: Couva -> POS via ${journey.fromNear.node.name} -> ${journey.toNear.node.name}`);
