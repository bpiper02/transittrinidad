import assert from 'node:assert/strict';
import {destinationBypassDiagnostic} from '../src/destination-bypass-core.mjs';

function node(id,lat,lng,extra={}){return{id,location:{lat,lng},...extra};}
function transit(from,to,mode='route_taxi'){return{kind:'transit',from,to,service:{id:`${from}-${to}`,mode},minutes:10};}

const destination={lat:10.00,lng:-61.00};

const bypassNodes=new Map([
  ['a',node('a',9.95,-61.20)],
  ['near-destination',node('near-destination',10.01,-61.01)],
  ['overshot',node('overshot',10.08,-61.01)],
  ['return-stop',node('return-stop',10.01,-61.00)]
]);
const bypass=destinationBypassDiagnostic({
  nodes:bypassNodes,
  toPlace:destination,
  toNear:{node:bypassNodes.get('return-stop'),km:0.3},
  steps:[
    transit('a','near-destination'),
    transit('near-destination','overshot'),
    transit('overshot','return-stop')
  ],
  destinationCatchmentKm:2.5,
  maxDestinationBypassKm:4
});
assert.equal(bypass.evaluated,true);
assert.equal(bypass.movesAwayAfterNearDestination,true);
assert.equal(bypass.returnsTowardDestination,true);
assert.equal(bypass.formalIntermodalException,false);
assert.equal(bypass.rejected,true,'journeys that pass near the destination, continue away, then return should be rejected');

const hubNodes=new Map([
  ['a',node('a',9.90,-61.20)],
  ['hub',node('hub',9.88,-61.25,{kind:'terminal'})],
  ['destination-stop',node('destination-stop',10.00,-61.00)]
]);
const hub=destinationBypassDiagnostic({
  nodes:hubNodes,
  toPlace:destination,
  toNear:{node:hubNodes.get('destination-stop'),km:0.1},
  steps:[transit('a','hub'),transit('hub','destination-stop')],
  destinationCatchmentKm:2.5,
  maxDestinationBypassKm:4
});
assert.equal(hub.movesAwayAfterNearDestination,false);
assert.equal(hub.rejected,false,'going to a hub before the destination is not destination bypassing');

const waterNodes=new Map([
  ['a',node('a',10.01,-61.02)],
  ['water-terminal',node('water-terminal',10.20,-61.20,{kind:'water_taxi_terminal'})],
  ['return-stop',node('return-stop',10.01,-61.00)]
]);
const water=destinationBypassDiagnostic({
  nodes:waterNodes,
  toPlace:destination,
  toNear:{node:waterNodes.get('return-stop'),km:0.2},
  steps:[transit('a','water-terminal','water_taxi'),transit('water-terminal','return-stop','route_taxi')],
  destinationCatchmentKm:2.5,
  maxDestinationBypassKm:4
});
assert.equal(water.movesAwayAfterNearDestination,true);
assert.equal(water.formalIntermodalException,true);
assert.equal(water.rejected,false,'formal water/ferry intermodal journeys can legitimately require larger terminal movement');

console.log('destination bypass diagnostics tests passed');
