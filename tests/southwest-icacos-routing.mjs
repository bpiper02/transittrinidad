import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {findJourney} from '../src/routing-core.mjs';

const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const [nodesArray,services,transfers]=await Promise.all([
  readJson('../data/nodes.json'),
  readJson('../data/services.json'),
  readJson('../data/transfers.json')
]);
const nodes=new Map(nodesArray.map(node=>[node.id,node]));

const icacosNode=nodes.get('icacos-area');
assert.ok(icacosNode,'Icacos endpoint node should exist after promotion');
assert.equal(icacosNode.kind,'stop_zone');
assert.equal(icacosNode.locationConfidence,'approximate_area');
assert.ok(icacosNode.boardingNote.includes('confirm the actual PTSC pickup/drop-off point locally'));

const service=services.find(item=>item.id==='ptsc-official-san-fernando-to-icacos');
assert.ok(service,'official San Fernando → Icacos PTSC service should exist');
assert.equal(service.mode,'ptsc');
assert.equal(service.serviceConfidence,'verified_service');
assert.equal(service.fareConfidence,'unknown','fare should remain unknown until captured from a fare/timetable source');
assert.equal(service.scheduleConfidence,'unknown','schedule should remain unknown until published times are captured');
assert.deepEqual(service.stopNodeIds,['ptsc-san-fernando','icacos-area']);
assert.equal(service.sources.some(source=>source.url==='https://ptsc.co.tt/routes/san-fernando-icacos/'),true);

const outbound=findJourney('ptsc-san-fernando','icacos-area',services,nodes,{transfers});
assert.ok(outbound,'San Fernando → Icacos should route through the official PTSC edge');
assert.equal(outbound.some(step=>step.kind==='transit'&&step.service?.id==='ptsc-official-san-fernando-to-icacos'),true);

const reverse=findJourney('icacos-area','ptsc-san-fernando',services,nodes,{transfers});
assert.equal(reverse,null,'Icacos → San Fernando must not be invented as a reverse PTSC service');

console.log('Southwest Icacos routing passed');
