import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseConnectedJourney,findJourney} from '../src/routing-core.mjs';

const nodesArray=JSON.parse(await readFile(new URL('../data/nodes.json',import.meta.url)));
const services=JSON.parse(await readFile(new URL('../data/services.json',import.meta.url)));
const transfers=JSON.parse(await readFile(new URL('../data/transfers.json',import.meta.url)));
const places=JSON.parse(await readFile(new URL('../data/places.json',import.meta.url)));
const nodes=new Map(nodesArray.map(node=>[node.id,node]));
const place=name=>places.find(item=>item.name===name)?.location;

assert.ok(findJourney('ptsc-point-fortin','la-brea-area',services,nodes,{transfers}),'Point Fortin should connect to La Brea through the official PTSC directional route');
assert.ok(findJourney('la-brea-area','ptsc-san-fernando',services,nodes,{transfers}),'La Brea should connect eastbound to San Fernando through the mapped Route 5 service');
assert.ok(findJourney('ptsc-scarborough-shaw-park','crown-point-area',services,nodes,{transfers}),'Scarborough should connect to Crown Point through mapped Tobago PTSC/taxi services');

const laBreaToPoint=chooseConnectedJourney({
  fromPlace:place('La Brea'),
  toPlace:nodes.get('ptsc-point-fortin').location,
  nodes,
  services,
  transfers,
  candidateLimit:12,
  maxAccessKm:5,
  rankingOptions:{passThroughAccessLimitKm:2.5,passThroughCandidateLimit:8}
});
assert.equal(laBreaToPoint,null,'La Brea to Point Fortin remains an unresolved directional evidence gap; do not route via a San Fernando backtrack or invent reverse PTSC service');

const crownPointToFerry=chooseConnectedJourney({
  fromPlace:place('Crown Point'),
  toPlace:nodes.get('scarborough-ferry-terminal').location,
  nodes,
  services,
  transfers,
  candidateLimit:12,
  maxAccessKm:5,
  rankingOptions:{passThroughAccessLimitKm:2.5,passThroughCandidateLimit:8}
});
assert.ok(crownPointToFerry,'Crown Point to Scarborough Ferry should route through the existing Tobago west-end public transport corridor');
assert.ok(crownPointToFerry.steps.some(step=>step.kind==='transit'),'Crown Point to Scarborough Ferry must include a mapped public transport leg');
assert.ok((crownPointToFerry.ranking?.estimatedBridgeConnectors||0)<=1,'Crown Point to Scarborough Ferry should not be stitched from multiple unsurveyed connectors');
