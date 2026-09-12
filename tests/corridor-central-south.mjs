import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {findJourney} from '../src/routing-core.mjs';

const nodesArray=JSON.parse(await readFile(new URL('../data/nodes.json',import.meta.url)));
const services=JSON.parse(await readFile(new URL('../data/services.json',import.meta.url)));
const nodes=new Map(nodesArray.map(node=>[node.id,node]));
const maxis=services.filter(service=>service.mode==='maxi');
const service=services.find(item=>item.id==='maxi-chag-san-fernando-out');
assert.ok(service,'southbound Chaguanas-San Fernando maxi must exist');
assert.deepEqual(service.stopNodeIds,['chag-maxi-area','chase-village-area','maxi-couva','california-area','claxton-bay-area','marabella-area','sf-chag-maxi']);
assert.equal(service.patternType,'local');
assert.equal(service.boardingPolicy,'corridor_hail');
assert.equal(service.alightingPolicy,'corridor_request');

for(const [from,to] of [
  ['california-area','claxton-bay-area'],
  ['maxi-couva','california-area'],
  ['chase-village-area','sf-chag-maxi'],
  ['claxton-bay-area','marabella-area']
]){
  const journey=findJourney(from,to,maxis,nodes);
  assert.ok(journey,`${from} → ${to} should route on the local southbound pattern`);
  assert.ok(journey.every(step=>step.kind!=='transit'||step.service.id==='maxi-chag-san-fernando-out'));
}

assert.equal(findJourney('claxton-bay-area','california-area',[service],nodes),null,'southbound local pattern must not manufacture reverse travel');
console.log('Central-South corridor routing tests passed');
