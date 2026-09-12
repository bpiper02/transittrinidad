import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseJourneyOptions} from '../src/routing-core.mjs';

const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const [pilot,publicPilot,nodesArray,servicesAll,transfers]=await Promise.all([
  readJson('../data/pilot-central-south-c1.json'),
  readJson('../public/data/pilot-central-south-c1.json'),
  readJson('../data/nodes.json'),
  readJson('../data/services.json'),
  readJson('../data/transfers.json')
]);
assert.deepEqual(publicPilot,pilot,'C1 pilot browser manifest must mirror canonical pilot manifest');
assert.equal(pilot.journeys.length,5,'C1 pilot must stay focused on five review journeys');
assert.equal(pilot.journeys.filter(journey=>journey.reverseProbe).length,1,'C1 pilot needs exactly one explicit reverse-direction probe');

const nodes=new Map(nodesArray.map(node=>[node.id,node]));
const services=servicesAll.filter(service=>service.serviceConfidence!=='needs_review');
const expectedSouthboundService='maxi-chag-san-fernando-out';

function assertTransitDirection(option,fixtureId){
  for(const step of option.steps.filter(step=>step.kind==='transit')){
    const stops=step.service?.stopNodeIds||[];
    const fromIndex=stops.indexOf(step.from),toIndex=stops.indexOf(step.to);
    assert.ok(fromIndex>=0&&toIndex>fromIndex,`${fixtureId}: ${step.service?.id} transit step must follow the service's stored direction`);
  }
}

for(const fixture of pilot.journeys){
  assert.ok(nodes.has(fixture.fromNodeId),`${fixture.id}: missing origin node`);
  assert.ok(nodes.has(fixture.toNodeId),`${fixture.id}: missing destination node`);
  const from=nodes.get(fixture.fromNodeId),to=nodes.get(fixture.toNodeId);
  const options=chooseJourneyOptions({
    fromPlace:{name:from.name,...from.location},toPlace:{name:to.name,...to.location},knownFrom:from,knownTo:to,
    nodes,services,transfers,candidateLimit:14,maxAccessKm:4,transferPenaltyMinutes:10,
    accessOptions:{localWaitMinutes:30,localKph:18},maxOptions:3,requiredMode:'maxi'
  });
  for(const option of options)assertTransitDirection(option,fixture.id);
  if(fixture.reverseProbe)continue;
  assert.ok(options.length,`${fixture.id}: core pilot journey must route`);
  const option=options[0];
  assert.equal(option.transferCount,0,`${fixture.id}: core pilot journey should stay on one vehicle`);
  const transit=option.steps.filter(step=>step.kind==='transit');
  assert.ok(transit.length,`${fixture.id}: needs transit steps`);
  assert.ok(transit.every(step=>step.service?.id===expectedSouthboundService),`${fixture.id}: must use the promoted local Route 3 southbound service`);
}
console.log('C1 Central-South pilot invariants passed: 4 core rides + 1 reverse probe');
