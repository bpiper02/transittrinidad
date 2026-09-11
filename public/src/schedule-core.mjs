const DAY_KEYS=['sun','mon','tue','wed','thu','fri','sat'];
const DAY_LABELS={sun:'Sun',mon:'Mon',tue:'Tue',wed:'Wed',thu:'Thu',fri:'Fri',sat:'Sat'};

function localParts(date,timeZone){
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(date);
  const value=type=>parts.find(part=>part.type===type)?.value;
  return{day:String(value('weekday')).toLowerCase().slice(0,3),minutes:Number(value('hour'))*60+Number(value('minute'))};
}

function timeMinutes(value){
  const [hours,minutes]=value.split(':').map(Number);
  return hours*60+minutes;
}

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

export function nextDepartures(schedule,now=new Date(),limit=3){
  if(!schedule||schedule.status!=='published_times'||!schedule.departureTimes?.length)return[];
  const local=localParts(now,schedule.timezone);
  const todayIndex=DAY_KEYS.indexOf(local.day);
  const results=[];
  for(let offset=0;offset<8&&results.length<limit;offset++){
    const day=DAY_KEYS[(todayIndex+offset)%7];
    if(!schedule.serviceDays.includes(day))continue;
    for(const time of schedule.departureTimes){
      if(offset===0&&timeMinutes(time)<local.minutes)continue;
      results.push({time,day,dayOffset:offset,label:offset===0?formatClock(time):offset===1?`Tomorrow ${formatClock(time)}`:`${DAY_LABELS[day]} ${formatClock(time)}`});
      if(results.length===limit)break;
    }
  }
  return results;
}
