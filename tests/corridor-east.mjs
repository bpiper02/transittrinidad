import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {findJourney} from '../src/routing-core.mjs';

const nodesArray=JSON.parse(await readFile(new URL('../data/nodes.json',import.meta.url)));
const services=JSON.parse(await readFile(new URL('../data/services.json',import.meta.url)));
const nodes=new Map(nodesArray.map(node=>[node.id,node]));
const east=services.find(item=>item.id==='maxi-pos-arima-out');
const west=services.find(item=>item.id==='maxi-pos-arima-back');
assert.ok(east&&west,'directional POS-Arima maxi services must exist');
assert.deepEqual(east.stopNodeIds,['ptsc-pos-transit-centre','ptsc-curepe','tunapuna-area','five-rivers-area','dabadie-area','arima-pbr-maxi']);
assert.deepEqual(west.stopNodeIds,[...east.stopNodeIds].reverse());
for(const forbidden of ['maloney-area','la-horquetta-area']){
  assert.equal(east.stopNodeIds.includes(forbidden),false,`${forbidden} must not be folded into the Arima PBR pattern`);
  assert.equal(west.stopNodeIds.includes(forbidden),false,`${forbidden} must not be folded into the Arima PBR pattern`);
}
for(const [service,from,to] of [
  [east,'ptsc-curepe','five-rivers-area'],
  [east,'tunapuna-area','dabadie-area'],
  [west,'dabadie-area','tunapuna-area'],
  [west,'arima-pbr-maxi','ptsc-curepe']
]){
  const journey=findJourney(from,to,[service],nodes);
  assert.ok(journey,`${from} → ${to} should route on ${service.id}`);
  assert.equal(new Set(journey.filter(step=>step.kind==='transit').map(step=>step.service.id)).size,1);
}
assert.equal(findJourney('dabadie-area','tunapuna-area',[east],nodes),null,'eastbound pattern must not manufacture westbound travel');
assert.equal(findJourney('tunapuna-area','dabadie-area',[west],nodes),null,'westbound pattern must not manufacture eastbound travel');
console.log('East corridor routing tests passed');
