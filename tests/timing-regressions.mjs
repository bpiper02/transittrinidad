import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseJourneyOptions} from '../src/routing-core.mjs';

const readJson=path=>readFile(new URL(path,import.meta.url),'utf8').then(JSON.parse);
const [nodesArray,services,transfers,schedules,places]=await Promise.all([
  readJson('../data/nodes.json'),readJson('../data/services.json'),readJson('../data/transfers.json'),readJson('../data/schedules.json'),readJson('../data/places.json')
]);
const nodes=new Map(nodesArray.map(node=>[node.id,node]));
const california=places.find(place=>place.name==='California'),arima=nodes.get('ptsc-arima');
const options=chooseJourneyOptions({
  fromPlace:california.location,toPlace:arima.location,nodes,services,transfers,schedules,
  departureDate:new Date('2026-09-14T11:30:00Z'),candidateLimit:12,maxAccessKm:4,requiredMode:'ptsc',
  accessOptions:{localWaitMinutes:10,localKph:18}
});
assert.ok(options.length,'California → Arima should route on a weekday');
const best=options[0];
assert.equal(best.fromNear.node.id,'california-area','northbound corridor should board at California instead of sending the rider back to Couva');
assert.ok(best.modes.includes('ptsc'));
assert.ok(best.estimatedMinutesMin<=best.estimatedMinutes&&best.estimatedMinutes<=best.estimatedMinutesMax);
assert.ok(best.estimatedMinutesMax-best.estimatedMinutesMin>=20,'unknown-frequency services should expose uncertainty instead of fake precision');
assert.ok(best.estimatedMinutesMax<=200,'California → Arima estimate must not regress to the earlier inflated duration');
console.log(`timing regressions passed: California → Arima ${best.estimatedMinutesMin}–${best.estimatedMinutesMax} min`);
