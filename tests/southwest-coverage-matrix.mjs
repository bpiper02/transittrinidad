import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseJourneyOptions,findJourney} from '../src/routing-core.mjs';

const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const [nodesArray,servicesAll,transfers]=await Promise.all([
  readJson('../data/nodes.json'),
  readJson('../data/services.json'),
  readJson('../data/transfers.json')
]);

const baseNodes=new Map(nodesArray.map(node=>[node.id,node]));
const services=servicesAll.filter(service=>service.serviceConfidence!=='needs_review');

function node(id){
  const item=baseNodes.get(id);
  assert.ok(item,`missing node ${id}`);
  assert.ok(item.location,`missing node location ${id}`);
  return item;
}

function assertDirect({id,from,to,mode}){
  const journey=findJourney(from,to,services,baseNodes,{transfers});
  assert.ok(journey,`${id}: expected direct routed service from ${from} to ${to}`);
  const transit=journey.filter(step=>step.kind==='transit');
  assert.ok(transit.length,`${id}: expected at least one transit step`);
  assert.ok(
    transit.some(step=>step.from===from&&step.to===to&&(!mode||step.service.mode===mode)),
    `${id}: expected a direct ${mode||'transit'} leg from ${from} to ${to}`
  );
}

function assertConnected({id,from,to,maxTransfers,requiredMode}){
  const fromNode=node(from),toNode=node(to);
  const options=chooseJourneyOptions({
    fromPlace:{name:fromNode.name,...fromNode.location},
    toPlace:{name:toNode.name,...toNode.location},
    knownFrom:fromNode,
    knownTo:toNode,
    nodes:new Map(nodesArray.map(item=>[item.id,item])),
    services,
    transfers,
    candidateLimit:14,
    maxAccessKm:5,
    transferPenaltyMinutes:10,
    accessOptions:{localWaitMinutes:30,localKph:18},
    rankingOptions:{passThroughAccessLimitKm:2.5,passThroughCandidateLimit:8},
    maxOptions:3,
    requiredMode:requiredMode||null
  });
  assert.ok(options.length,`${id}: expected a connected rider journey`);
  const best=options[0];
  assert.ok(best.steps.some(step=>step.kind==='transit'),`${id}: expected transit`);
  assert.ok(best.transferCount<=maxTransfers,`${id}: expected <=${maxTransfers} transfers, got ${best.transferCount}`);
  if(requiredMode)assert.ok(best.modes.includes(requiredMode),`${id}: expected mode ${requiredMode}`);
  const visited=[best.fromNear.node.id,...best.steps.map(step=>step.to)];
  assert.equal(new Set(visited).size,visited.length,`${id}: route must not loop/revisit nodes`);
}

const directCoverage=[
  {id:'sf-to-siparia-maxi',from:'sf-siparia-maxi',to:'maxi-siparia',mode:'maxi'},
  {id:'siparia-to-sf-taxi',from:'siparia-sf-taxi',to:'ptsc-san-fernando',mode:'route_taxi'},
  {id:'penal-to-siparia-taxi',from:'penal-siparia-taxi',to:'siparia-penal-taxi',mode:'route_taxi'},
  {id:'siparia-to-penal-taxi',from:'siparia-penal-taxi',to:'penal-siparia-taxi',mode:'route_taxi'},
  {id:'point-fortin-to-sf-ptsc',from:'ptsc-point-fortin',to:'ptsc-san-fernando',mode:'ptsc'},
  {id:'sf-to-point-fortin-ptsc',from:'ptsc-san-fernando',to:'ptsc-point-fortin',mode:'ptsc'},
  {id:'sf-to-la-brea-maxi',from:'sf-la-brea-area',to:'la-brea-area',mode:'maxi'},
  {id:'la-brea-to-sf-maxi',from:'la-brea-area',to:'sf-la-brea-area',mode:'maxi'},
  {id:'point-fortin-to-la-brea-ptsc',from:'ptsc-point-fortin',to:'la-brea-area',mode:'ptsc'},
  {id:'fyzabad-to-sf-taxi',from:'fyzabad-area',to:'ptsc-san-fernando',mode:'route_taxi'},
  {id:'sf-to-fyzabad-taxi',from:'ptsc-san-fernando',to:'fyzabad-area',mode:'route_taxi'},
  {id:'siparia-to-erin-taxi',from:'siparia-erin-taxi',to:'erin-area',mode:'route_taxi'},
  {id:'sf-to-erin-ptsc',from:'ptsc-san-fernando',to:'erin-area',mode:'ptsc'}
];

for(const fixture of directCoverage)assertDirect(fixture);

const connectedCoverage=[
  {id:'penal-to-san-fernando',from:'penal-siparia-taxi',to:'ptsc-san-fernando',maxTransfers:1,requiredMode:'route_taxi'},
  {id:'siparia-to-point-fortin',from:'siparia-sf-taxi',to:'ptsc-point-fortin',maxTransfers:2},
  {id:'fyzabad-to-siparia',from:'fyzabad-area',to:'siparia-fyzabad-taxi',maxTransfers:1,requiredMode:'route_taxi'},
  {id:'la-brea-to-port-of-spain',from:'la-brea-area',to:'ptsc-pos-transit-centre',maxTransfers:2},
  {id:'point-fortin-to-port-of-spain',from:'ptsc-point-fortin',to:'ptsc-pos-transit-centre',maxTransfers:1,requiredMode:'ptsc'},
  {id:'san-fernando-to-erin',from:'ptsc-san-fernando',to:'erin-area',maxTransfers:0,requiredMode:'ptsc'}
];

for(const fixture of connectedCoverage)assertConnected(fixture);

assert.equal(findJourney('la-brea-area','ptsc-point-fortin',services,baseNodes,{transfers}),null,'La Brea → Point Fortin must remain unresolved until reverse evidence is added');
assert.equal(findJourney('erin-area','siparia-erin-taxi',services,baseNodes,{transfers}),null,'Erin → Siparia taxi must not be invented from the one-way Siparia → Erin record');

console.log(`Southwest coverage matrix passed: ${directCoverage.length} direct patterns, ${connectedCoverage.length} connected journeys`);
