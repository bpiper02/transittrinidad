const DAY_LABELS={sun:'Sun',mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat'};

function localParts(date,timeZone){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const value=type=>parts.find(part=>part.type===type)?.value;
  return {day:String(value('weekday')).toLowerCase().slice(0,3),dateKey:`${value('year')}-${value('month')}-${value('day')}`,minutes:Number(value('hour'))*60+Number(value('minute'))};
}

function timeMinutes(value){ const [hours,minutes]=value.split(':').map(Number); return hours*60+minutes; }
function scheduleList(value){ return Array.isArray(value)?value:value?[value]:[]; }

export function formatClock(value){
  const [hours,minutes]=value.split(':').map(Number);
  const suffix=hours>=12?'PM':'AM';
  return `${hours%12||12}:${String(minutes).padStart(2,'0')} ${suffix}`;
}

export function formatServiceDays(days=[]){
  const key=days.join(',');
  if(key==='mon,tue,wed,thu,fri')return'Mon–Fri';
  if(key==='sat,sun')return'Weekends';
  if(key==='mon,tue,wed,thu,fri,sat,sun')return'Daily';
  return days.map(day=>DAY_LABELS[day]||day).join(', ');
}

export function scheduleForDate(schedules,date=new Date()){
  const list=scheduleList(schedules);
  const timeZone=list[0]?.timezone||'America/Port_of_Spain';
  const local=localParts(date,timeZone);
  const dated=list.filter(schedule=>schedule.activeDates?.includes(local.dateKey));
  if(dated.length)return dated[0];
  return list.find(schedule=>!schedule.excludedDates?.includes(local.dateKey)&&schedule.serviceDays.includes(local.day))||null;
}

export function nextDepartures(schedules,now=new Date(),limit=3){
  const list=scheduleList(schedules);
  if(!list.length)return[];
  const timeZone=list[0].timezone;
  const results=[];
  for(let offset=0;offset<8&&results.length<limit;offset++){
    const date=new Date(now.getTime()+offset*86400000);
    const local=localParts(date,timeZone);
    const schedule=scheduleForDate(list,date);
    if(!schedule||schedule.status!=='published_times'||!schedule.departureTimes?.length)continue;
    for(const time of schedule.departureTimes){
      if(offset===0&&timeMinutes(time)<local.minutes)continue;
      results.push({time,day:local.day,dateKey:local.dateKey,dayOffset:offset,scheduleId:schedule.id,label:offset===0?formatClock(time):offset===1?`Tomorrow ${formatClock(time)}`:`${DAY_LABELS[local.day]} ${formatClock(time)}`});
      if(results.length===limit)break;
    }
  }
  return results;
}
