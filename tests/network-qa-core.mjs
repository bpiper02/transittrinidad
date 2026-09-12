import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildNetworkQA,formatNetworkQASummary} from '../src/network-qa-core.mjs';

const source={name:'Fixture',url:'https://example.com',checkedAt:'2026-09-12'};
const nodes=[
  {id:'a',name:'A',kind:'stand',location:{lat:10.5,lng:-61.4},locationConfidence:'verified_station',sources:[source]},
  {id:'b',name:'B',kind:'stand',location:{lat:10.55,lng:-61.35},locationConfidence:'approximate_area',sources:[source]},
  {id:'orphan',name:'Orphan',kind:'stand',location:{lat:10.6,lng:-61.3},locationConfidence:'mapped_station',sources:[source]}
];
const services=[{id:'maxi-a-b',corridorId:'a-b',mode:'maxi',operator:'Fixture',originNodeId:'a',destinationNodeId:'b',stopNodeIds:['a','b'],serviceConfidence:'reported_service',geometryConfidence:'endpoints_only',geometry:null,fareTTD:null,fareConfidence:'unknown',scheduleConfidence:'unknown',sources:[source]}];
const places=[
  {id:'near',name:'Near',location:{lat:10.5,lng:-61.4},routingRadiusKm:2},
  {id:'far',name:'Far',location:{lat:11.2,lng:-60.7},routingRadiusKm:1}
];
const report=buildNetworkQA({nodes,services,transfers:[],schedules:[],places});
assert.equal(report.summary.services,1);
assert.equal(report.summary.routableServices,1);
assert.equal(report.summary.corridors,1);
assert.equal(report.summary.fareCoveragePct,0);
assert.equal(report.summary.disconnectedPlaces,1);
assert.ok(report.services[0].issues.includes('reported_service'));
assert.ok(report.services[0].issues.includes('fare_missing'));
assert.ok(report.services[0].issues.includes('geometry_endpoints_only'));
assert.ok(report.services[0].issues.includes('operation_unknown'));
assert.ok(report.services[0].issues.includes('reverse_unconfirmed'));
assert.ok(report.services[0].issues.includes('approximate_boarding'));
assert.ok(report.nodes.find(node=>node.id==='orphan').issues.includes('orphan_node'));
assert.ok(report.places.find(place=>place.id==='far').issues.includes('place_disconnected'));
assert.match(formatNetworkQASummary(report),/Coverage:/);

const read=name=>JSON.parse(readFileSync(new URL(`../data/${name}.json`,import.meta.url),'utf8'));
const live=buildNetworkQA({nodes:read('nodes'),services:read('services'),transfers:read('transfers'),schedules:read('schedules'),places:read('places')});
assert.ok(live.summary.services>=100,'expected substantial canonical service inventory');
assert.ok(live.summary.corridors>=50,'expected substantial corridor inventory');
assert.equal(live.summary.routableServices,live.summary.services-(live.summary.servicesByConfidence.needs_review||0));
assert.ok(live.summary.fareCoveragePct>=0&&live.summary.fareCoveragePct<=100);
assert.ok(live.summary.geometryCoveragePct>=0&&live.summary.geometryCoveragePct<=100);
assert.ok(live.summary.operationCoveragePct>=0&&live.summary.operationCoveragePct<=100);
console.log(formatNetworkQASummary(live));
console.log('network QA tests passed');
