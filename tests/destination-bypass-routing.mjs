import assert from 'node:assert/strict';
import {chooseJourneyOptions} from '../src/routing-core.mjs';

function node(id,lat,lng,extra={}){return{id,name:id,location:{lat,lng},...extra};}
function service(id,mode,stopNodeIds){
  return{id,corridorId:id,mode,operator:'fixture',originNodeId:stopNodeIds[0],destinationNodeId:stopNodeIds.at(-1),stopNodeIds,estimatedMinutes:20,serviceConfidence:'official_current'};
}

const destination={lat:10.00,lng:-61.00};
const nodes=new Map([
  ['a',node('a',9.95,-61.20)],
  ['near-destination',node('near-destination',10.01,-61.01)],
  ['overshot',node('overshot',10.08,-61.01)],
  ['return-stop',node('return-stop',10.01,-61.00)]
]);
const bypassService=service('bad-near-away-return','route_taxi',['a','near-destination','overshot','return-stop']);

const rejected=chooseJourneyOptions({
  fromPlace:nodes.get('a').location,
  toPlace:destination,
  knownFrom:nodes.get('a'),
  knownTo:nodes.get('return-stop'),
  nodes,
  services:[bypassService],
  transfers:[],
  candidateLimit:4
});
assert.equal(rejected.length,0,'near-destination → overshot → return candidates should be filtered out');

const allowedForInspection=chooseJourneyOptions({
  fromPlace:nodes.get('a').location,
  toPlace:destination,
  knownFrom:nodes.get('a'),
  knownTo:nodes.get('return-stop'),
  nodes,
  services:[bypassService],
  transfers:[],
  allowDestinationBypass:true,
  candidateLimit:4
});
assert.equal(allowedForInspection.length,1,'the same candidate should remain inspectable when the guard is explicitly disabled');
assert.equal(allowedForInspection[0].ranking.destinationBypass.rejected,true);

const waterNodes=new Map([
  ['a',node('a',10.01,-61.02)],
  ['water-terminal',node('water-terminal',10.20,-61.20,{kind:'water_taxi_terminal'})],
  ['return-stop',node('return-stop',10.01,-61.00)]
]);
const waterServices=[service('formal-water-leg','water_taxi',['a','water-terminal']),service('terminal-return-leg','route_taxi',['water-terminal','return-stop'])];
const water=chooseJourneyOptions({
  fromPlace:waterNodes.get('a').location,
  toPlace:destination,
  knownFrom:waterNodes.get('a'),
  knownTo:waterNodes.get('return-stop'),
  nodes:waterNodes,
  services:waterServices,
  transfers:[],
  candidateLimit:4
});
assert.equal(water.length,1,'formal water/ferry intermodal journeys should not be blocked by the bypass guard');
assert.equal(water[0].ranking.destinationBypass.formalIntermodalException,true);

console.log('destination bypass routing tests passed');
