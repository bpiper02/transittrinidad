import assert from 'node:assert/strict';
import {estimateJourneyTiming,serviceRunsOnDate,waitForService} from '../src/journey-time-core.mjs';

const ptsc={id:'ptsc-a-b',mode:'ptsc',originNodeId:'a'};
const maxi={id:'maxi-b-c',mode:'maxi',originNodeId:'b'};
const schedule={serviceId:ptsc.id,status:'published_times',timezone:'America/Port_of_Spain',serviceDays:['mon','tue','wed','thu','fri'],departureTimes:['08:00','09:00']};
assert.equal(waitForService(ptsc,[schedule],new Date('2026-09-14T11:50:00Z')),10);
assert.equal(waitForService(maxi,[],new Date('2026-09-14T11:50:00Z')),8);
assert.equal(serviceRunsOnDate(ptsc,[schedule],new Date('2026-09-14T11:50:00Z')),true);
assert.equal(serviceRunsOnDate(ptsc,[schedule],new Date('2026-09-13T11:50:00Z')),false);
const timing=estimateJourneyTiming([
  {kind:'transit',from:'a',to:'x',service:ptsc,minutes:20},
  {kind:'transit',from:'x',to:'b',service:ptsc,minutes:10},
  {kind:'transfer',from:'b',to:'b2',minutes:5},
  {kind:'transit',from:'b2',to:'c',service:maxi,minutes:15}
],{schedules:[schedule],departureDate:new Date('2026-09-14T11:50:00Z')});
assert.equal(timing.waitMinutes,18,'wait is counted once per boarding, not once per segment');
assert.equal(timing.rideMinutes,45);
assert.equal(timing.transferMinutes,5);
assert.equal(timing.totalMinutes,68);
assert.equal(timing.minTotalMinutes,63);
assert.equal(timing.maxTotalMinutes,72);
console.log('journey timing core tests passed');
