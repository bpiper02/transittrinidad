import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {findJourney} from '../src/routing-core.mjs';

const nodesArray=JSON.parse(await readFile(new URL('../data/nodes.json',import.meta.url)));
const services=JSON.parse(await readFile(new URL('../data/services.json',import.meta.url)));
const nodes=new Map(nodesArray.map(node=>[node.id,node]));
const service=services.find(item=>item.id==='maxi-black-san-fernando-to-princes-town');
assert.ok(service,'San Fernando → Princes Town service must exist');
assert.deepEqual(service.stopNodeIds,['sf-princes-town-maxi','palmyra-area','mount-stewart-area','cleghorn-area','iere-area','princes-town-local-area']);
assert.equal(service.patternType,'local');
assert.equal(service.boardingPolicy,'corridor_hail');
assert.equal(service.alightingPolicy,'corridor_request');

for(const [from,to] of [
  ['palmyra-area','iere-area'],
  ['mount-stewart-area','princes-town-local-area'],
  ['cleghorn-area','iere-area'],
  ['sf-princes-town-maxi','mount-stewart-area']
]){
  const journey=findJourney(from,to,[service],nodes);
  assert.ok(journey,`${from} → ${to} should route on the San Fernando → Princes Town local service`);
  assert.equal(new Set(journey.filter(step=>step.kind==='transit').map(step=>step.service.id)).size,1);
}
assert.equal(findJourney('iere-area','palmyra-area',[service],nodes),null,'forward pattern must not manufacture reverse travel');
console.log('San Fernando → Princes Town corridor routing tests passed');
