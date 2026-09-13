import assert from 'node:assert/strict';
import {accessScore,accessSummary,nearbyAccessCandidates,nodeAccessKind,serviceUsageByNode} from '../src/access-diagnostics-core.mjs';

const nodes=[
  {id:'random-highway',name:'Random Highway Point',kind:'highway_point',location:{lat:10.6500,lng:-61.5000}},
  {id:'main-road',name:'Eastern Main Road Access',kind:'junction',location:{lat:10.6503,lng:-61.5010}},
  {id:'formal-stand',name:'San Juan Taxi Stand',kind:'stand',location:{lat:10.6510,lng:-61.5030}},
  {id:'approx-zone',name:'Approximate San Juan Area',kind:'stop_zone',locationConfidence:'approximate_area',location:{lat:10.6490,lng:-61.5010}},
  {id:'far-formal',name:'Far Terminal',kind:'terminal',location:{lat:10.7200,lng:-61.6000}}
];
const services=[
  {id:'s1',originNodeId:'formal-stand',destinationNodeId:'main-road',serviceConfidence:'verified_service'},
  {id:'s2',originNodeId:'formal-stand',destinationNodeId:'main-road',serviceConfidence:'reported_service'},
  {id:'s3',originNodeId:'random-highway',destinationNodeId:'far-formal',serviceConfidence:'needs_review'}
];
const place={name:'User location',lat:10.6502,lng:-61.5007};

assert.equal(nodeAccessKind(nodes[0]),'unsafe');
assert.equal(nodeAccessKind(nodes[1]),'main_road');
assert.equal(nodeAccessKind(nodes[2]),'formal');
assert.equal(nodeAccessKind(nodes[3]),'approximate_area');

const usage=serviceUsageByNode(services);
assert.equal(usage.get('formal-stand'),2);
assert.equal(usage.get('main-road'),2);
assert.equal(usage.has('random-highway'),false,'needs_review services should not improve access ranking');

assert.ok(accessScore({distanceKm:.5,accessKind:'formal',usedByCount:1})>accessScore({distanceKm:.1,accessKind:'approximate_area',usedByCount:0}));
assert.ok(accessScore({distanceKm:.1,accessKind:'unsafe',usedByCount:20})<0,'unsafe nodes cannot win from service count');

const candidates=nearbyAccessCandidates(place,nodes,services,{limit:4,maxKm:2});
assert.equal(candidates.some(candidate=>candidate.nodeId==='random-highway'),false,'unsafe nodes should be hidden by default');
assert.equal(candidates[0].nodeId,'formal-stand','formal high-use stands should beat vague closer nodes');
assert.equal(candidates.some(candidate=>candidate.nodeId==='far-formal'),false,'far nodes should be filtered by maxKm');

const withUnsafe=nearbyAccessCandidates(place,nodes,services,{limit:5,maxKm:2,includeUnsafe:true});
assert.equal(withUnsafe.some(candidate=>candidate.nodeId==='random-highway'),true,'diagnostics can include unsafe nodes only when requested');

const summary=accessSummary(place,nodes,services,{limit:3,maxKm:2});
assert.equal(summary.hasUsableAccess,true);
assert.equal(summary.certainty,'high');
assert.equal(summary.best.nodeId,'formal-stand');
assert.ok(summary.candidates.length<=3);

console.log('access diagnostics core tests passed');
