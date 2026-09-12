import assert from 'node:assert/strict';
import {coverageReport,fareForJourney,fareForSegment,formatFare,validateFareDataset} from '../src/fare-core.mjs';

const nodes=[
  {id:'a',location:{lat:10.5,lng:-61.5}},
  {id:'b',location:{lat:10.45,lng:-61.48}},
  {id:'c',location:{lat:10.4,lng:-61.46}},
  {id:'d',location:{lat:10.3,lng:-61.4}}
];
const service={id:'maxi-a-d',corridorId:'maxi-a-d',mode:'maxi',originNodeId:'a',destinationNodeId:'d',stopNodeIds:['a','b','c','d'],fareTTD:12,fareConfidence:'community_verified',serviceConfidence:'community_verified'};
const noFare={id:'taxi-a-d',corridorId:'taxi-a-d',mode:'route_taxi',originNodeId:'a',destinationNodeId:'d',stopNodeIds:['a','d'],fareTTD:null,fareConfidence:'unknown',serviceConfidence:'reported_service'};
const override={id:'override-b-c',serviceId:'maxi-a-d',fromNodeId:'b',toNodeId:'c',minTTD:5,maxTTD:6,confidence:'community_verified',method:'driver_confirmation',sources:[]};

validateFareDataset([override],{services:[service],nodes});
assert.throws(()=>validateFareDataset([{...override,id:'bad',minTTD:9,maxTTD:4}],{services:[service],nodes}),/invalid range/);

const exact=fareForSegment({service,fromNodeId:'b',toNodeId:'c',fares:[override],nodes});
assert.equal(exact.minTTD,5);
assert.equal(exact.maxTTD,6);
assert.equal(exact.confidence,'community_verified');

const legacy=fareForSegment({service,fromNodeId:'a',toNodeId:'d',fares:[],nodes});
assert.equal(legacy.minTTD,12);
assert.equal(legacy.maxTTD,12);
assert.equal(legacy.confidence,'community_verified');

const interpolated=fareForSegment({service,fromNodeId:'b',toNodeId:'d',fares:[],nodes});
assert.equal(interpolated.confidence,'estimated');
assert.equal(interpolated.method,'same_service_interpolation');
assert.ok(interpolated.minTTD>0&&interpolated.maxTTD>=interpolated.minTTD);

const fallback=fareForSegment({service:noFare,fromNodeId:'a',toNodeId:'d',fares:[],nodes});
assert.equal(fallback.confidence,'estimated');
assert.ok(['mode_distance_range','mode_fallback_range'].includes(fallback.method));

const journey=fareForJourney([
  {kind:'transit',service,from:'b',to:'c'},
  {kind:'transit',service:noFare,from:'a',to:'d'}
],{fares:[override],nodes});
assert.ok(journey.minTTD>0&&journey.maxTTD>=journey.minTTD);
assert.equal(journey.confidence,'includes_estimate');

assert.equal(formatFare({minTTD:7,maxTTD:7,confidence:'estimated'}),'Est. TT$7');
assert.equal(formatFare({minTTD:7,maxTTD:10,confidence:'estimated'}),'Est. TT$7–10');
assert.equal(formatFare({minTTD:9,maxTTD:9,confidence:'community_verified'}),'TT$9');

const coverage=coverageReport([service,noFare],{fares:[override],nodes});
assert.equal(coverage.displayCoveragePct,100);
assert.equal(coverage.counts.missing,0);
assert.ok(coverage.counts.estimated>0);

console.log('fare-core tests passed');
