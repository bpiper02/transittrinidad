import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {findJourney} from '../src/routing-core.mjs';
import {fareForJourney} from '../src/fare-core.mjs';

const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const nodesArray=await readJson('../data/nodes.json');
const services=await readJson('../data/services.json');
const fares=await readJson('../data/fares.json');
const nodes=new Map(nodesArray.map(node=>[node.id,node]));
const byId=new Map(services.map(service=>[service.id,service]));

const cases=[
  ['central-south','maxi-chag-san-fernando-out','california-area','claxton-bay-area'],
  ['central-south','maxi-chag-san-fernando-out','maxi-couva','marabella-area'],
  ['east','maxi-pos-arima-out','ptsc-curepe','five-rivers-area'],
  ['east','maxi-pos-arima-back','dabadie-area','tunapuna-area'],
  ['south','maxi-black-san-fernando-to-princes-town','palmyra-area','iere-area'],
  ['tobago-northside','ptsc-scarborough-to-lanse-fourmi','castara-area','ptsc-lanse-fourmi-area'],
  ['tobago-windward','ptsc-scarborough-to-charlotteville','roxborough-area','ptsc-charlotteville-area'],
  ['tobago-windward','ptsc-charlotteville-to-scarborough','ptsc-charlotteville-area','roxborough-area']
];

for(const [region,serviceId,from,to] of cases){
  const service=byId.get(serviceId);
  assert.ok(service,`${serviceId} must exist for ${region}`);
  const journey=findJourney(from,to,[service],nodes);
  assert.ok(journey,`${region}: ${from} → ${to} must route`);
  assert.equal(new Set(journey.filter(step=>step.kind==='transit').map(step=>step.service.id)).size,1,`${region}: intermediate ride must stay on one service`);
  const fare=fareForJourney(journey,{fares,nodes:nodesArray});
  assert.ok(fare&&fare.minTTD>0&&fare.maxTTD>=fare.minTTD,`${region}: rider-facing fare must exist for ${from} → ${to}`);
}

// Direction and family separation: these must remain impossible on the named service alone.
assert.equal(findJourney('claxton-bay-area','california-area',[byId.get('maxi-chag-san-fernando-out')],nodes),null,'southbound Route 3 must not synthesize reverse travel');
assert.equal(findJourney('dabadie-area','tunapuna-area',[byId.get('maxi-pos-arima-out')],nodes),null,'eastbound Route 2 must not synthesize westbound travel');
assert.equal(findJourney('iere-area','palmyra-area',[byId.get('maxi-black-san-fernando-to-princes-town')],nodes),null,'Princes Town-bound service must not synthesize reverse travel');
assert.equal(findJourney('bloody-bay-area','roxborough-area',[byId.get('ptsc-scarborough-to-lanse-fourmi')],nodes),null,'Tobago Northside must remain separate from Windward');

for(const service of services.filter(service=>/point-fortin/.test(service.id)&&['maxi','route_taxi'].includes(service.mode))){
  assert.equal(service.stopNodeIds.includes('la-brea-area'),false,`${service.id} must not absorb La Brea`);
}

console.log(`national corridor regressions passed: ${cases.length} representative intermediate journeys`);
