import {normalizeDepartureTimes} from './ptsc-import-core.mjs';

const DAY_KEYS={monday:['mon'],tuesday:['tue'],wednesday:['wed'],thursday:['thu'],friday:['fri'],saturday:['sat'],sunday:['sun']};
const slug=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export function normalizePTSCServiceDays(labels=[]){
  const days=[];
  for(const label of labels){
    const key=String(label).toLowerCase();
    if(key.includes('monday')&&key.includes('friday')){
      for(const day of ['mon','tue','wed','thu','fri'])if(!days.includes(day))days.push(day);
    }else{
      for(const [name,values] of Object.entries(DAY_KEYS))if(key.includes(name))for(const day of values)if(!days.includes(day))days.push(day);
    }
  }
  return days;
}

function source(candidate,checkedAt){
  return{name:'PTSC Routes and Schedules',url:candidate.url,checkedAt};
}

function addSource(service,next){
  return{...service,sources:[...(service.sources||[]).filter(item=>item.url!==next.url),next]};
}

function upsertById(list,item){const index=list.findIndex(value=>value.id===item.id);if(index<0)list.push(item);else list[index]=item;}

export function promotePTSCReview({review,snapshot,services,schedules,fares}){
  const nextServices=structuredClone(services),nextSchedules=structuredClone(schedules),nextFares=structuredClone(fares);
  const checkedAt=review.source?.checkedAt||snapshot.source?.checkedAt;
  const detailed=new Map((snapshot.records||[]).map(record=>[record.officialId,record]));
  const pairCorridors=new Map(nextServices.filter(item=>item.mode==='ptsc').map(item=>[`${item.originNodeId}->${item.destinationNodeId}`,item.corridorId]));
  const report={promoted:[],upgraded:[],blocked:[],missingFare:[]};

  for(const candidate of review.candidates){
    if(candidate.status==='needs_endpoint_mapping'){report.blocked.push({officialId:candidate.officialId,title:candidate.title,blockers:candidate.blockers});continue;}
    const existingId=candidate.existingServiceId;
    const serviceId=existingId||`ptsc-official-${slug(candidate.officialId.replace('ptsc-card-',''))}`;
    const officialSource=source(candidate,checkedAt);
    let service=nextServices.find(item=>item.id===serviceId);
    if(!service){
      const pair=`${candidate.originNodeId}->${candidate.destinationNodeId}`;
      service={
        id:serviceId,
        corridorId:pairCorridors.get(pair)||`ptsc-${slug(candidate.originNodeId)}-${slug(candidate.destinationNodeId)}`,
        mode:'ptsc',operator:'PTSC',originNodeId:candidate.originNodeId,destinationNodeId:candidate.destinationNodeId,
        stopNodeIds:[candidate.originNodeId,candidate.destinationNodeId],serviceConfidence:'verified_service',
        geometryConfidence:'endpoints_only',geometry:null,fareTTD:candidate.fareTTD,
        fareConfidence:candidate.fareTTD==null?'unknown':'official_current',scheduleConfidence:'official_current',
        officialRouteTitle:candidate.title,officialRecordId:candidate.officialId,sources:[officialSource]
      };
      nextServices.push(service);pairCorridors.set(pair,service.corridorId);report.promoted.push(serviceId);
    }else{
      const index=nextServices.findIndex(item=>item.id===serviceId);
      service=addSource({...service,fareTTD:candidate.fareTTD??service.fareTTD,fareConfidence:candidate.fareTTD==null?service.fareConfidence:'official_current'},officialSource);
      nextServices[index]=service;report.upgraded.push(serviceId);
    }

    const days=normalizePTSCServiceDays(candidate.serviceDays);
    const detail=detailed.get(candidate.officialId);
    const departureTimes=detail?normalizeDepartureTimes(detail):[];
    if(days.length&&!nextSchedules.some(item=>item.serviceId===serviceId&&item.serviceDays.some(day=>days.includes(day)))){
      upsertById(nextSchedules,{
        id:`${serviceId}-${days.join('-')}`,serviceId,timezone:'America/Port_of_Spain',serviceDays:days,departureTimes,
        status:departureTimes.length?'published_times':'times_unavailable',confidence:'official_current',sources:[officialSource]
      });
    }
    if(candidate.fareTTD!=null){
      upsertById(nextFares,{id:`${serviceId}-official-fare`,serviceId,fromNodeId:candidate.originNodeId,toNodeId:candidate.destinationNodeId,
        minTTD:candidate.fareTTD,maxTTD:candidate.fareTTD,confidence:'official_current',method:'published_fare',sources:[officialSource]});
    }else report.missingFare.push(candidate.officialId);
  }
  return{services:nextServices,schedules:nextSchedules,fares:nextFares,report};
}
