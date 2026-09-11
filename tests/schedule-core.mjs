import assert from 'node:assert/strict';
import {formatClock,formatServiceDays,nextDepartures} from '../src/schedule-core.mjs';

const schedule={
  status:'published_times',
  timezone:'America/Port_of_Spain',
  serviceDays:['mon','tue','wed','thu','fri'],
  departureTimes:['05:00','08:30','15:00']
};

assert.equal(formatClock('00:05'),'12:05 AM');
assert.equal(formatClock('13:15'),'1:15 PM');
assert.equal(formatServiceDays(schedule.serviceDays),'Mon–Fri');
assert.deepEqual(
  nextDepartures(schedule,new Date('2026-09-11T11:00:00Z'),2).map(item=>item.label),
  ['8:30 AM','3:00 PM']
);
assert.deepEqual(
  nextDepartures(schedule,new Date('2026-09-12T16:00:00Z'),1).map(item=>item.label),
  ['Mon 5:00 AM']
);
assert.deepEqual(nextDepartures({...schedule,status:'times_unavailable',departureTimes:[]}),[]);

console.log('schedule core tests passed');
