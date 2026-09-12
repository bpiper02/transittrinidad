import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {findJourney} from '../src/routing-core.mjs';

const nodesArray=JSON.parse(await readFile(new URL('../data/nodes.json',import.meta.url)));
const services=JSON.parse(await readFile(new URL('../data/services.json',import.meta.url)));
const nodes=new Map(nodesArray.map(node=>[node.id,node]));
const north=services.find(item=>item.id==='ptsc-scarborough-to-lanse-fourmi');
const windEast=services.find(item=>item.id==='ptsc-scarborough-to-charlotteville');
const windWest=services.find(item=>item.id==='ptsc-charlotteville-to-scarborough');
assert.ok(north&&windEast&&windWest,'Tobago corridor services must exist');
assert.deepEqual(north.stopNodeIds,['ptsc-scarborough-shaw-park','moriah-area','castara-area','parlatuvier-area','bloody-bay-area','ptsc-lanse-fourmi-area']);
assert.deepEqual(windEast.stopNodeIds,['ptsc-scarborough-shaw-park','roxborough-area','speyside-area','ptsc-charlotteville-area']);
assert.deepEqual(windWest.stopNodeIds,[...windEast.stopNodeIds].reverse());

for(const [service,from,to] of [
  [north,'moriah-area','parlatuvier-area'],
  [north,'castara-area','ptsc-lanse-fourmi-area'],
  [windEast,'roxborough-area','ptsc-charlotteville-area'],
  [windEast,'speyside-area','ptsc-charlotteville-area'],
  [windWest,'ptsc-charlotteville-area','roxborough-area']
]){
  const journey=findJourney(from,to,[service],nodes);
  assert.ok(journey,`${from} → ${to} should route on ${service.id}`);
  assert.equal(new Set(journey.filter(step=>step.kind==='transit').map(step=>step.service.id)).size,1);
}
assert.equal(findJourney('bloody-bay-area','roxborough-area',[north],nodes),null,'Northside service must not silently become the Windward route');
assert.equal(findJourney('speyside-area','castara-area',[windWest],nodes),null,'Windward service must not silently become Northside service');
console.log('Tobago corridor routing tests passed');
