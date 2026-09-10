import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseConnectedJourney,findJourney,nearestNodes} from '../src/routing-core.mjs';

const nodesArray=JSON.parse(await readFile(new URL('../data/nodes.json',import.meta.url)));
const services=JSON.parse(await readFile(new URL('../data/services.json',import.meta.url)));
const nodes=new Map(nodesArray.map(node=>[node.id,node]));

assert.ok(findJourney('ptsc-chaguanas','ptsc-pos-transit-centre',services),'PTSC Chaguanas must connect to PTSC Port of Spain');

const portOfSpain={lat:10.6500,lng:-61.5140};
const nearestToPos=nearestNodes(portOfSpain,nodes,{limit:1})[0];
assert.notEqual(nearestToPos.node.id,'ptsc-pos-transit-centre','fixture must reproduce the bug: geographically nearest POS node is not PTSC');

const couva={lat:10.422,lng:-61.462};
const journey=chooseConnectedJourney({fromPlace:couva,toPlace:portOfSpain,nodes,services,candidateLimit:6});
assert.ok(journey,'Couva to Port of Spain should find a connected nearby-node journey');
assert.equal(journey.toNear.node.id,'ptsc-pos-transit-centre','route-aware snapping should choose the connected PTSC destination node');
assert.ok(journey.legs.length>=1,'connected journey should include transit');

console.log(`routing core tests passed: Couva -> POS via ${journey.fromNear.node.name} -> ${journey.toNear.node.name}`);
