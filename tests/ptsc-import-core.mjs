import assert from 'node:assert/strict';
import {buildPTSCCandidates, daysFromPTSCLabel, normalizeDepartureTimes, normalizeEndpoint, parsePTSCClock} from '../src/ptsc-import-core.mjs';

assert.equal(parsePTSCClock('12:00', 'am'), '00:00');
assert.equal(parsePTSCClock('12:00', 'pm'), '12:00');
assert.equal(parsePTSCClock('4:05', 'pm'), '16:05');
assert.deepEqual(normalizeDepartureTimes({amTimes:['5:00'], pmTimes:['12:00','1:00','1:00']}), ['05:00','12:00','13:00']);
assert.deepEqual(daysFromPTSCLabel('Monday-Friday'), ['mon','tue','wed','thu','fri']);
assert.equal(normalizeEndpoint(' POS '), 'Port of Spain');

const snapshot = {source:{name:'PTSC directory',url:'https://ptsc.co.tt/routes-and-schedules/',checkedAt:'2026-09-11'},records:[
  {officialId:'aripo',title:'Arima / Aripo',from:'Arima',to:'Aripo',serviceDays:'Monday-Friday',fareTTD:3,amTimes:['5:00'],pmTimes:['1:00']},
  {officialId:'aripo-sat',title:'Arima / Aripo',from:'Arima',to:'Aripo',serviceDays:'Saturday',fareTTD:3,amTimes:['7:00'],pmTimes:[]},
  {officialId:'scale',title:'Scale / POS',from:'#6 Scale',to:'POS',serviceDays:'Saturday',fareTTD:12,amTimes:['4:00'],pmTimes:[]}
]};
const candidates = buildPTSCCandidates(snapshot, {
  nodes:[{id:'ptsc-arima',name:'Arima PTSC Transit Hub'},{id:'ptsc-aripo',name:'Aripo'}],
  services:[{id:'ptsc-arima-to-aripo',mode:'ptsc',originNodeId:'ptsc-arima',destinationNodeId:'ptsc-aripo'}],
  schedules:[{serviceId:'ptsc-arima-to-aripo',serviceDays:['mon','tue','wed','thu','fri']}]
});
assert.equal(candidates[0].reviewStatus, 'schedule_upgrade_review');
assert.deepEqual(candidates[0].schedule.departureTimes, ['05:00','13:00']);
assert.equal(candidates[1].reviewStatus, 'schedule_variant_review');
assert.equal(candidates[2].reviewStatus, 'needs_endpoint_mapping');
assert.equal(candidates[0].schedule.id, 'ptsc-arima-aripo-weekday');
console.log('PTSC import core tests passed');
