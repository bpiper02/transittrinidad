import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {accessSummary} from '../src/access-diagnostics-core.mjs';
import {exactPlace,placeToPoint} from '../src/place-core.mjs';

const nodes=JSON.parse(readFileSync(new URL('../data/nodes.json',import.meta.url),'utf8'));
const services=JSON.parse(readFileSync(new URL('../data/services.json',import.meta.url),'utf8'));
const places=JSON.parse(readFileSync(new URL('../data/places.json',import.meta.url),'utf8'));

function pointFor(name){
  const place=exactPlace(name,places);
  assert.ok(place,`${name} should exist in place aliases`);
  return placeToPoint(place);
}

for(const name of ['San Juan','Port of Spain','Chaguanas','Couva','Arima']){
  const point=pointFor(name);
  const summary=accessSummary(point,nodes,services,{limit:5,maxKm:Math.max(4,point.routingRadiusKm||4)});
  assert.equal(summary.hasUsableAccess,true,`${name} should have at least one usable nearby access candidate`);
  assert.ok(['high','medium','low'].includes(summary.certainty),`${name} should have usable access confidence`);
  assert.ok(summary.best.distanceKm<=Math.max(4,point.routingRadiusKm||4),`${name} best access should be within routing radius`);
  assert.notEqual(summary.best.accessKind,'unsafe',`${name} best access cannot be unsafe`);
}

const sanJuan=accessSummary(pointFor('San Juan'),nodes,services,{limit:5,maxKm:4});
assert.ok(sanJuan.candidates.some(candidate=>['formal','main_road','mapped_stop_zone'].includes(candidate.accessKind)),'San Juan should expose practical transport access, not only vague approximate areas');

const pos=accessSummary(pointFor('Port of Spain'),nodes,services,{limit:5,maxKm:4});
assert.ok(pos.candidates.some(candidate=>candidate.accessKind==='formal'),'Port of Spain should surface formal terminal/stand access');

console.log('access diagnostics real-data tests passed');
