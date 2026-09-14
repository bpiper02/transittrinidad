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

function directServiceExists({from,to,mode}){
  return services.some(service=>{
    if(mode&&service.mode!==mode)return false;
    const stops=service.stopNodeIds||[];
    const fromIndex=stops.indexOf(from);
    const toIndex=stops.indexOf(to);
    return fromIndex>=0&&toIndex>fromIndex;
  });
}

function assertDirect({id,from,to,mode}){
  assert.ok(
    directServiceExists({from,to,mode}),
    `${id}: expected direct ${mode||'transit'} service data from ${from} to ${to}`
  );
  const journey=findJourney(from,to,services,baseNodes,{transfers});
  assert.ok(journey,`${id}: expected routable journey from ${from} to ${to}`);
}

function assertNoDirectService({id,from,to,mode}){
  assert.equal(
    directServiceExists({from,to,mode}),
    false,
    `${id}: must not invent direct ${mode||'transit'} service data from ${from} to ${to}`
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
  {id:'siparia-to-fyzabad-taxi',from:'siparia-fyzabad-taxi',to:'fyzabad-area',mode:'route_taxi'},
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
  {id:'la-brea-to-port-of-spain',from:'la-brea-area',to:'ptsc-pos-transit-centre',maxTransfers:2},
  {id:'point-fortin-to-port-of-spain',from:'ptsc-point-fortin',to:'ptsc-pos-transit-centre',maxTransfers:1,requiredMode:'ptsc'},
  {id:'san-fernando-to-erin',from:'ptsc-san-fernando',to:'erin-area',maxTransfers:0,requiredMode:'ptsc'}
];

for(const fixture of connectedCoverage)assertConnected(fixture);

assertNoDirectService({id:'la-brea-to-point-fortin-ptsc-reverse',from:'la-brea-area',to:'ptsc-point-fortin',mode:'ptsc'});
assertNoDirectService({id:'fyzabad-to-siparia-route-taxi-reverse',from:'fyzabad-area',to:'siparia-fyzabad-taxi',mode:'route_taxi'});
assertNoDirectService({id:'erin-to-siparia-route-taxi-reverse',from:'erin-area',to:'siparia-erin-taxi',mode:'route_taxi'});

console.log(`Southwest coverage matrix passed: ${directCoverage.length} direct patterns, ${connectedCoverage.length} connected journeys`);
