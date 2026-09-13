import assert from 'node:assert/strict';
import {projectPointToSegment,routePassThroughSegments,virtualAccessCandidates} from '../src/pass-through-core.mjs';

function node(id,lat,lng,kind='junction'){
  return{id,name:id,kind,location:{lat,lng}};
}

const nodes=new Map([
  ['san-juan-main-road',node('san-juan-main-road',10.648,-61.451,'junction')],
  ['barataria-main-road',node('barataria-main-road',10.650,-61.470,'junction')],
  ['unsafe-highway',node('unsafe-highway',10.650,-61.490,'highway_point')],
  ['city-gate',node('city-gate',10.648,-61.512,'terminal')]
]);

const passThroughService={
  id:'fixture-san-juan-pos-pass-through',
  corridorId:'fixture-east-west',
  mode:'maxi',
  serviceConfidence:'verified_service',
  originNodeId:'san-juan-main-road',
  destinationNodeId:'city-gate',
  boardingPolicy:'main_road_pass_through',
  alightingPolicy:'main_road_pass_through',
  passThroughSegments:[
    {fromNodeId:'san-juan-main-road',toNodeId:'barataria-main-road',confidence:'mapped_corridor'}
  ]
};

const terminalOnlyService={
  id:'fixture-terminal-only',
  corridorId:'fixture-terminal',
  mode:'ptsc',
  serviceConfidence:'verified_service',
  originNodeId:'san-juan-main-road',
  destinationNodeId:'city-gate',
  boardingPolicy:'terminal_or_stand_only'
};

const unsafeService={
  id:'fixture-unsafe-pass-through',
  corridorId:'fixture-unsafe',
  mode:'route_taxi',
  serviceConfidence:'verified_service',
  originNodeId:'unsafe-highway',
  destinationNodeId:'city-gate',
  boardingPolicy:'main_road_pass_through',
  passThroughSegments:[
    {fromNodeId:'unsafe-highway',toNodeId:'city-gate',confidence:'mapped_corridor'}
  ]
};

const projection=projectPointToSegment({lat:10.649,lng:-61.454},nodes.get('san-juan-main-road').location,nodes.get('barataria-main-road').location);
assert.ok(projection.distanceKm<0.2,'nearby point should project onto the corridor segment');
assert.ok(projection.t>0&&projection.t<1,'projection should land inside the segment');

const segments=routePassThroughSegments(passThroughService,nodes);
assert.equal(segments.length,1,'main-road pass-through service should expose safe segment');
assert.equal(routePassThroughSegments(terminalOnlyService,nodes).length,0,'terminal-only services must not create pass-through access');
assert.equal(routePassThroughSegments(unsafeService,nodes).length,0,'unsafe highway nodes must not create pass-through access');

const nearCandidates=virtualAccessCandidates({lat:10.649,lng:-61.454},[passThroughService,terminalOnlyService,unsafeService],nodes,{maxAccessKm:1.2});
assert.equal(nearCandidates.length,1,'nearby rider should get one virtual boarding candidate');
assert.equal(nearCandidates[0].kind,'virtual_boarding_area');
assert.equal(nearCandidates[0].serviceId,passThroughService.id);
assert.equal(nearCandidates[0].accessLabel,'Estimated main-road boarding area');
assert.ok(nearCandidates[0].safetyNote.includes('safe visible point'));

const farCandidates=virtualAccessCandidates({lat:10.72,lng:-61.60},[passThroughService],nodes,{maxAccessKm:1.2});
assert.equal(farCandidates.length,0,'far riders should not snap to distant pass-through corridors');

const dropoffCandidates=virtualAccessCandidates({lat:10.649,lng:-61.454},[passThroughService],nodes,{role:'alighting',maxAccessKm:1.2});
assert.equal(dropoffCandidates[0].kind,'virtual_alighting_area');

console.log('pass-through core tests passed');
