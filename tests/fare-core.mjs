import assert from 'node:assert/strict';
import {coverageReport,fareForJourney,fareForSegment,formatFare,validateFareDataset} from '../src/fare-core.mjs';

const nodes=[
  {id:'a',location:{lat:10.5,lng:-61.5}},
  {id:'b',location:{lat:10.45,lng:-61.48}},
  {id:'c',location:{lat:10.4,lng:-61.46}},
  {id:'d',location:{lat:10.3,lng:-61.4}},
  {id:'missing'}
];
const service={id:'maxi-a-d',corridorId:'maxi-a-d',mode:'maxi',originNodeId:'a',destinationNodeId:'d',stopNodeIds:['a','b','c','d'],fareTTD:12,fareConfidence:'community_verified',serviceConfidence:'community_verified'};
const historical={id:'ptsc-a-d-old',corridorId:'ptsc-a-d-old',mode:'ptsc',originNodeId:'a',destinationNodeId:'d',stopNodeIds:['a','d'],fareTTD:3,fareConfidence:'official_historical',serviceConfidence:'verified_service'};
const noFare={id:'taxi-a-d',corridorId:'taxi-a-d',mode:'route_taxi',originNodeId:'a',destinationNodeId:'d',stopNodeIds:['a','d'],fareTTD:null,fareConfidence:'unknown',serviceConfidence:'reported_service'};
const missingDistance={id:'taxi-a-missing',corridorId:'taxi-a-missing',mode:'route_taxi',originNodeId:'a',destinationNodeId:'missing',stopNodeIds:['a','missing'],fareTTD:null,fareConfidence:'unknown',serviceConfidence:'reported_service'};
const override={id:'override-b-c',serviceId:'maxi-a-d',fromNodeId:'b',toNodeId:'c',minTTD:5,maxTTD:6,confidence:'community_verified',method:'driver_confirmation',sources:[{name:'Driver confirmation',checkedAt:'2026-09-12'}]};

validateFareDataset([override],{services:[service],nodes});
assert.throws(()=>validateFareDataset([{...override,id:'bad',minTTD:9,maxTTD:4}],{services:[service],nodes}),/invalid range/);
assert.throws(()=>validateFareDataset([{...override,id:'unknown-confidence',confidence:'unknown'}],{services:[service],nodes}),/invalid confidence/);
assert.throws(()=>validateFareDataset([{...override,id:'unsourced',sources:[]}],{services:[service],nodes}),/needs a source/);

const exact=fareForSegment({service,fromNodeId:'b',toNodeId:'c',fares:[override],nodes});
assert.equal(exact.minTTD,5);
assert.equal(exact.maxTTD,6);
assert.equal(exact.confidence,'community_verified');

const legacy=fareForSegment({service,fromNodeId:'a',toNodeId:'d',fares:[],nodes});
assert.equal(legacy.minTTD,12);
assert.equal(legacy.maxTTD,12);
assert.equal(legacy.confidence,'community_verified');

const historicalFare=fareForSegment({service:historical,fromNodeId:'a',toNodeId:'d',fares:[],nodes});
assert.equal(historicalFare.confidence,'estimated');
assert.equal(historicalFare.method,'legacy_fare_calibrated_range');
assert.equal(historicalFare.minTTD,3);
assert.ok(historicalFare.maxTTD>3);

const interpolated=fareForSegment({service,fromNodeId:'b',toNodeId:'d',fares:[],nodes});
assert.equal(interpolated.confidence,'estimated');
assert.equal(interpolated.method,'same_service_interpolation');
assert.ok(interpolated.minTTD>0&&interpolated.maxTTD>=interpolated.minTTD);

const fallback=fareForSegment({service:noFare,fromNodeId:'a',toNodeId:'d',fares:[],nodes});
assert.equal(fallback.confidence,'estimated');
assert.equal(fallback.method,'mode_distance_range');

const unknownDistance=fareForSegment({service:missingDistance,fromNodeId:'a',toNodeId:'missing',fares:[],nodes});
assert.equal(unknownDistance.method,'mode_fallback_range');
assert.equal(unknownDistance.minTTD,20);
assert.equal(unknownDistance.maxTTD,36);

const journey=fareForJourney([
  {kind:'transit',service,from:'b',to:'c'},
  {kind:'transit',service:noFare,from:'a',to:'d'}
],{fares:[override],nodes});
assert.ok(journey.minTTD>0&&journey.maxTTD>=journey.minTTD);
assert.equal(journey.confidence,'includes_estimate');

assert.equal(formatFare({minTTD:7,maxTTD:7,confidence:'estimated'}),'Est. TT$7');
assert.equal(formatFare({minTTD:7,maxTTD:10,confidence:'estimated'}),'Est. TT$7–10');
assert.equal(formatFare({minTTD:9,maxTTD:9,confidence:'community_verified'}),'TT$9');

const coverage=coverageReport([service,historical,noFare,missingDistance],{fares:[override],nodes});
assert.equal(coverage.displayCoveragePct,100);
assert.equal(coverage.counts.missing,0);
assert.ok(coverage.counts.estimated>0);

// A partial leg of a multi-stop service must never be quoted higher than the confirmed full-route fare.
const longRouteNodes=[
  {id:'p',location:{lat:10.0,lng:-61.60}},
  {id:'q',location:{lat:10.0,lng:-61.52}},
  {id:'r',location:{lat:10.0,lng:-61.44}},
  {id:'s',location:{lat:10.0,lng:-61.20}},
  {id:'t',location:{lat:10.0,lng:-61.16}}
];
const longRouteService={id:'maxi-p-t',corridorId:'maxi-p-t',mode:'maxi',originNodeId:'p',destinationNodeId:'t',stopNodeIds:['p','q','r','s','t'],fareTTD:12,fareConfidence:'community_verified',serviceConfidence:'community_verified'};
const longRouteFull=fareForSegment({service:longRouteService,fromNodeId:'p',toNodeId:'t',fares:[],nodes:longRouteNodes});
const longRoutePartial=fareForSegment({service:longRouteService,fromNodeId:'p',toNodeId:'s',fares:[],nodes:longRouteNodes});
assert.ok(longRoutePartial.maxTTD<=longRouteFull.maxTTD,'a shorter leg must not be quoted above the confirmed full-route fare');
assert.ok(longRoutePartial.minTTD<=longRoutePartial.maxTTD,'partial-leg fare range must stay internally consistent');

// The same monotonicity must hold when the full-route fare lives only as a fares.json record, not the legacy service.fareTTD field.
const recordOnlyService={id:'maxi-p-t-record',corridorId:'maxi-p-t-record',mode:'maxi',originNodeId:'p',destinationNodeId:'t',stopNodeIds:['p','q','r','s','t'],fareTTD:null,fareConfidence:'unknown',serviceConfidence:'community_verified'};
const fullRouteRecord={id:'full-route-record',serviceId:'maxi-p-t-record',fromNodeId:'p',toNodeId:'t',minTTD:11,maxTTD:13,confidence:'community_verified',method:'driver_confirmation',sources:[{name:'Driver confirmation',checkedAt:'2026-09-12'}]};
const recordFull=fareForSegment({service:recordOnlyService,fromNodeId:'p',toNodeId:'t',fares:[fullRouteRecord],nodes:longRouteNodes});
const recordPartial=fareForSegment({service:recordOnlyService,fromNodeId:'p',toNodeId:'s',fares:[fullRouteRecord],nodes:longRouteNodes});
assert.ok(recordPartial.maxTTD<=recordFull.maxTTD,'a shorter leg must not exceed a full-route fare stored only as a fares.json record');
assert.equal(recordPartial.method,'same_service_interpolation','partial legs should interpolate from the known full-route fare instead of falling back to a generic mode/distance estimate');

console.log('fare-core tests passed');
