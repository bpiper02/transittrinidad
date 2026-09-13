import {nextDepartures,scheduleForDate} from './schedule-core.mjs';

const DEFAULT_WAIT_MINUTES={ptsc:15,maxi:8,route_taxi:10,water_taxi:20,ferry:30};
const DEFAULT_WAIT_RANGES={ptsc:[5,25],maxi:[3,12],route_taxi:[4,15],water_taxi:[10,30],ferry:[15,45]};
const timeMinutes=value=>{const[hour,minute]=String(value).split(':').map(Number);return hour*60+minute;};

function localMinutes(date,timeZone){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const value=type=>Number(parts.find(part=>part.type===type)?.value||0);
  return value('hour')*60+value('minute');
}

export function waitForService(service,serviceSchedules=[],at=new Date(),{waitMinutes=DEFAULT_WAIT_MINUTES}={}){
  const published=serviceSchedules.filter(schedule=>schedule.status==='published_times'&&schedule.departureTimes?.length);
  if(published.length){
    const next=nextDepartures(published,at,1)[0];
    if(next)return Math.max(0,next.dayOffset*1440+timeMinutes(next.time)-localMinutes(at,published[0].timezone));
  }
  return waitMinutes[service.mode]??12;
}

function waitRangeForService(service,serviceSchedules,at,timetableApplies){
  if(timetableApplies&&serviceSchedules.some(schedule=>schedule.status==='published_times')){
    const exact=waitForService(service,serviceSchedules,at);
    return[exact,exact];
  }
  return DEFAULT_WAIT_RANGES[service.mode]||[5,20];
}

export function serviceRunsOnDate(service,serviceSchedules=[],date=new Date()){
  if(!serviceSchedules.length)return true;
  return Boolean(scheduleForDate(serviceSchedules,date));
}

export function estimateJourneyTiming(steps,{schedules=[],departureDate=new Date(),waitMinutes=DEFAULT_WAIT_MINUTES}={}){
  const schedulesByService=new Map();
  for(const schedule of schedules)schedulesByService.set(schedule.serviceId,[...(schedulesByService.get(schedule.serviceId)||[]),schedule]);
  let elapsedMinutes=0,rideMinutes=0,transferMinutes=0,waitTotal=0,minWaitMinutes=0,maxWaitMinutes=0,lastServiceId=null;
  const boardings=[];
  for(const step of steps||[]){
    if(step.kind==='transfer'){
      const minutes=Number.isFinite(step.minutes)?step.minutes:step.transfer?.estimatedMinutes||0;
      elapsedMinutes+=minutes;transferMinutes+=minutes;continue;
    }
    if(step.service.id!==lastServiceId){
      const at=new Date(departureDate.getTime()+elapsedMinutes*60000);
      const serviceSchedules=schedulesByService.get(step.service.id)||[];
      const timetableApplies=step.from===step.service.originNodeId;
      const wait=timetableApplies?waitForService(step.service,serviceSchedules,at,{waitMinutes}):(waitMinutes[step.service.mode]??12);
      const waitRange=waitRangeForService(step.service,serviceSchedules,at,timetableApplies);
      elapsedMinutes+=wait;waitTotal+=wait;minWaitMinutes+=waitRange[0];maxWaitMinutes+=waitRange[1];boardings.push({serviceId:step.service.id,waitMinutes:wait,waitRange,source:timetableApplies&&serviceSchedules.some(item=>item.status==='published_times')?'published_schedule':'mode_estimate'});
    }
    const minutes=Number.isFinite(step.minutes)?step.minutes:0;
    elapsedMinutes+=minutes;rideMinutes+=minutes;lastServiceId=step.service.id;
  }
  return{totalMinutes:elapsedMinutes,minTotalMinutes:rideMinutes+transferMinutes+minWaitMinutes,maxTotalMinutes:rideMinutes+transferMinutes+maxWaitMinutes,rideMinutes,transferMinutes,waitMinutes:waitTotal,minWaitMinutes,maxWaitMinutes,boardings};
}
