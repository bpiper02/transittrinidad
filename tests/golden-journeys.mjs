import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseJourneyOptions} from '../src/routing-core.mjs';
import {fareForJourney} from '../src/fare-core.mjs';

const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const [nodesArray,servicesAll,transfers,fares,golden]=await Promise.all([
  readJson('../data/nodes.json'),readJson('../data/services.json'),readJson('../data/transfers.json'),readJson('../data/fares.json'),readJson('../data/golden-journeys.json')
]);
const nodes=new Map(nodesArray.map(node=>[node.id,node]));
const services=servicesAll.filter(service=>service.serviceConfidence!=='needs_review');

assert.ok(golden.length>=25,'pilot golden suite should cover at least 25 journeys');
const ids=new Set();
for(const fixture of golden){
  assert.equal(ids.has(fixture.id),false,`duplicate golden journey id ${fixture.id}`);ids.add(fixture.id);
  const from=nodes.get(fixture.from),to=nodes.get(fixture.to);
  assert.ok(from?.location,`${fixture.id}: missing origin node/location ${fixture.from}`);
  assert.ok(to?.location,`${fixture.id}: missing destination node/location ${fixture.to}`);
  const options=chooseJourneyOptions({
    fromPlace:{name:from.name,...from.location},toPlace:{name:to.name,...to.location},knownFrom:from,knownTo:to,
    nodes,services,transfers,candidateLimit:14,maxAccessKm:4,transferPenaltyMinutes:10,
    accessOptions:{localWaitMinutes:30,localKph:18},maxOptions:3,requiredMode:fixture.requiredMode||null
  });
  assert.ok(options.length,`${fixture.id}: expected a journey`);
  const option=options[0];
  assert.ok(option.steps.some(step=>step.kind==='transit'),`${fixture.id}: expected transit`);
  assert.ok(option.transferCount<=fixture.maxTransfers,`${fixture.id}: ${option.transferCount} transfers exceeds ${fixture.maxTransfers}`);
  if(fixture.requiredMode)assert.ok(option.modes.includes(fixture.requiredMode),`${fixture.id}: must include ${fixture.requiredMode}`);
  const visited=[option.fromNear.node.id,...option.steps.map(step=>step.to)];
  assert.equal(new Set(visited).size,visited.length,`${fixture.id}: route must not loop/revisit nodes`);
  const fare=fareForJourney(option.steps,{fares,nodes:nodesArray});
  assert.ok(fare&&fare.minTTD>0&&fare.maxTTD>=fare.minTTD,`${fixture.id}: fare/range required`);
}
console.log(`golden journey suite passed: ${golden.length} rider journeys`);
