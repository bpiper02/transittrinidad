import assert from 'node:assert/strict';
import {boardingGuidance,passThroughSafetyCopy,transitAction} from '../src/rider-instruction-core.mjs';

const localMaxi={mode:'maxi',patternType:'local',boardingPolicy:'corridor_hail',alightingPolicy:'corridor_request'};
assert.equal(transitAction(localMaxi,{toward:'San Fernando',bandLabel:'Route 3 / Green Band',fromIsTerminal:false}),'Hail the Route 3 / Green Band toward San Fernando');
assert.equal(transitAction(localMaxi,{toward:'San Fernando',bandLabel:'Route 3 / Green Band',fromIsTerminal:true}),'Take the Route 3 / Green Band toward San Fernando');
assert.equal(boardingGuidance(localMaxi,{fromName:'California',toName:'Claxton Bay',fromIsTerminal:false,toIsTerminal:false}),'Hail at California in the service direction · Tell the driver you’re getting off at Claxton Bay');
assert.equal(boardingGuidance(localMaxi,{fromName:'Chaguanas Maxi Stand',toName:'San Fernando',fromIsTerminal:true,toIsTerminal:true}),'Board at Chaguanas Maxi Stand');

const fixed={mode:'ptsc',patternType:'fixed_route',boardingPolicy:'fixed_only',alightingPolicy:'fixed_only'};
assert.equal(transitAction(fixed,{toward:'Charlotteville'}),'Board PTSC toward Charlotteville');
assert.equal(boardingGuidance(fixed,{fromName:'Roxborough',toName:'Charlotteville'}),'Board at Roxborough');

const limited={mode:'maxi',patternType:'limited',boardingPolicy:'fixed_only',alightingPolicy:'fixed_only'};
assert.equal(transitAction(limited,{toward:'Point Fortin',bandLabel:'Route 5 / Brown Band'}),'Board the Route 5 / Brown Band toward Point Fortin');

const virtualBoarding='virtual-boarding-maxi-pos-arima-san-juan-0-512';
const passThroughMaxi={mode:'maxi',patternType:'local',boardingPolicy:'main_road_pass_through',alightingPolicy:'main_road_pass_through'};
assert.equal(transitAction(passThroughMaxi,{toward:'Port of Spain',bandLabel:'Route 2 / Red Band',fromName:virtualBoarding}),'Hail the Route 2 / Red Band toward Port of Spain');
const virtualGuidance=boardingGuidance(passThroughMaxi,{fromName:virtualBoarding,toName:'Port of Spain Transit Centre'});
assert.match(virtualGuidance,/estimated main-road boarding area/,'virtual boarding ids must not leak to riders');
assert.match(virtualGuidance,/visible, legal, well-lit/,'virtual boarding must include safety copy');
assert.doesNotMatch(virtualGuidance,/virtual-boarding/,'rider copy must hide internal virtual node ids');

const virtualDropOff='virtual-alighting-maxi-pos-arima-barataria-0-300';
assert.equal(
  transitAction(passThroughMaxi,{toward:virtualDropOff,bandLabel:'Route 3 / Green Band',fromName:'California'}),
  'Hail the Route 3 / Green Band toward estimated main-road drop-off area'
);
const dropOffGuidance=boardingGuidance(passThroughMaxi,{fromName:'Port of Spain Route 2 stand',toName:virtualDropOff,fromIsTerminal:true});
assert.match(dropOffGuidance,/estimated main-road drop-off area/,'virtual alighting ids must become rider-safe drop-off copy');
assert.doesNotMatch(dropOffGuidance,/virtual-alighting/,'rider copy must hide internal virtual alighting ids');
assert.match(passThroughSafetyCopy(),/Prefer a stand/);

const localConnector={
  id:'local-connector-virtual-local-origin-101803--615468-virtual-local-destination-101333--615000',
  corridorId:'local-connector-fallback',
  mode:'route_taxi',
  boardingNote:'Use a rideshare, hail a taxi, or arrange a short local taxi connection. This is an estimate, not a surveyed route.'
};
assert.equal(transitAction(localConnector,{toward:'Estimated local connector destination'}),'Use a local taxi or rideshare toward Estimated local connector destination');
const connectorGuidance=boardingGuidance(localConnector,{fromName:'Estimated local connector start',toName:'Estimated local connector destination'});
assert.match(connectorGuidance,/rideshare|hail a taxi|short local taxi/i,'local connector fallback should explain practical access options');
assert.match(connectorGuidance,/not a surveyed route/i,'local connector fallback must keep uncertainty visible');

console.log('rider instruction core tests passed');
