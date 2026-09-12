export const FARE_CONFIDENCE_ORDER={official_current:6,community_verified:5,reported_current:4,legacy_current:3,estimated:2,unknown:0};

const DEFAULT_RULES={
  ptsc:[{maxKm:10,min:2.5,max:4},{maxKm:25,min:3,max:6},{maxKm:50,min:4,max:9},{maxKm:Infinity,min:6,max:15}],
  maxi:[{maxKm:8,min:5,max:8},{maxKm:20,min:6,max:11},{maxKm:35,min:8,max:14},{maxKm:60,min:10,max:19},{maxKm:Infinity,min:14,max:26}],
  route_taxi:[{maxKm:8,min:5,max:9},{maxKm:20,min:8,max:15},{maxKm:35,min:12,max:21},{maxKm:60,min:15,max:29},{maxKm:Infinity,min:20,max:36}],
  water_taxi:[{maxKm:Infinity,min:15,max:15}],
  ferry:[{maxKm:Infinity,min:75,max:75}]
};

function roundFare(value){
  if(!Number.isFinite(value))return null;
  return Math.round(value*2)/2;
}

export function kmBetween(a,b){
  if(!a?.location||!b?.location)return null;
  const R=6371,rad=x=>x*Math.PI/180;
  const dLat=rad(b.location.lat-a.location.lat),dLng=rad(b.location.lng-a.location.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a.location.lat))*Math.cos(rad(b.location.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}

function nodeMap(nodes=[]){return new Map(nodes.map(node=>[node.id,node]));}

function segmentDistanceKm(service,fromNodeId,toNodeId,nodes=[]){
  const stops=service.stopNodeIds||[];
  const fromIndex=stops.indexOf(fromNodeId),toIndex=stops.indexOf(toNodeId);
  if(fromIndex<0||toIndex<0||toIndex<=fromIndex)return null;
  const lookup=nodeMap(nodes);
  let total=0,hasAny=false;
  for(let i=fromIndex;i<toIndex;i++){
    const km=kmBetween(lookup.get(stops[i]),lookup.get(stops[i+1]));
    if(Number.isFinite(km)){total+=km;hasAny=true;}
  }
  if(hasAny)return total;
  return kmBetween(lookup.get(fromNodeId),lookup.get(toNodeId));
}

export function validateFareRecord(record,{services=[],nodes=[]}={}){
  if(!record||typeof record!=='object')throw new Error('fare record is required');
  if(!record.id||!String(record.id).trim())throw new Error('fare record id is required');
  if(!record.serviceId&&!record.corridorId)throw new Error(`fare ${record.id} needs serviceId or corridorId`);
  if(!record.fromNodeId||!record.toNodeId||record.fromNodeId===record.toNodeId)throw new Error(`fare ${record.id} needs distinct fromNodeId/toNodeId`);
  if(!Number.isFinite(record.minTTD)||!Number.isFinite(record.maxTTD)||record.minTTD<0||record.maxTTD<record.minTTD)throw new Error(`fare ${record.id} has invalid range`);
  if(!FARE_CONFIDENCE_ORDER[record.confidence])throw new Error(`fare ${record.id} has invalid confidence`);
  if(!record.method||!String(record.method).trim())throw new Error(`fare ${record.id} needs method`);
  if(!Array.isArray(record.sources))throw new Error(`fare ${record.id} sources must be an array`);
  if(services.length&&record.serviceId&&!services.some(service=>service.id===record.serviceId))throw new Error(`fare ${record.id} references unknown service ${record.serviceId}`);
  if(nodes.length){
    const ids=new Set(nodes.map(node=>node.id));
    if(!ids.has(record.fromNodeId)||!ids.has(record.toNodeId))throw new Error(`fare ${record.id} references unknown node`);
  }
  return true;
}

export function validateFareDataset(records,{services=[],nodes=[]}={}){
  if(!Array.isArray(records))throw new Error('fares must be an array');
  const ids=new Set(),keys=new Set();
  for(const record of records){
    validateFareRecord(record,{services,nodes});
    if(ids.has(record.id))throw new Error(`duplicate fare id ${record.id}`);
    ids.add(record.id);
    const key=`${record.serviceId||'*'}|${record.corridorId||'*'}|${record.fromNodeId}|${record.toNodeId}`;
    if(keys.has(key))throw new Error(`duplicate fare coverage ${key}`);
    keys.add(key);
  }
  return true;
}

function exactRecord(records,service,fromNodeId,toNodeId){
  return records.filter(record=>record.fromNodeId===fromNodeId&&record.toNodeId===toNodeId&&(record.serviceId===service.id||(!record.serviceId&&record.corridorId===service.corridorId)))
    .sort((a,b)=>(FARE_CONFIDENCE_ORDER[b.confidence]||0)-(FARE_CONFIDENCE_ORDER[a.confidence]||0))[0]||null;
}

function legacyFullFare(service,fromNodeId,toNodeId){
  if(fromNodeId!==service.originNodeId||toNodeId!==service.destinationNodeId||!Number.isFinite(service.fareTTD))return null;
  const confidence=service.fareConfidence==='official_current'?'official_current':service.fareConfidence==='community_verified'?'community_verified':service.fareConfidence==='reported'?'reported_current':'legacy_current';
  return {minTTD:service.fareTTD,maxTTD:service.fareTTD,confidence,method:'legacy_service_fare',sourceKind:'service'};
}

function interpolateFromFullFare(service,fromNodeId,toNodeId,nodes=[]){
  if(!Number.isFinite(service.fareTTD))return null;
  const stops=service.stopNodeIds||[];
  const fromIndex=stops.indexOf(fromNodeId),toIndex=stops.indexOf(toNodeId);
  if(fromIndex<0||toIndex<=fromIndex||stops.length<3)return null;
  const wholeKm=segmentDistanceKm(service,service.originNodeId,service.destinationNodeId,nodes);
  const segmentKm=segmentDistanceKm(service,fromNodeId,toNodeId,nodes);
  const indexRatio=(toIndex-fromIndex)/(stops.length-1);
  const ratio=Number.isFinite(wholeKm)&&wholeKm>0&&Number.isFinite(segmentKm)?Math.min(1,Math.max(0.1,segmentKm/wholeKm)):indexRatio;
  const center=Math.max(3,service.fareTTD*ratio);
  const width=Math.max(1.5,center*0.2);
  return {minTTD:roundFare(Math.max(2.5,center-width)),maxTTD:roundFare(center+width),confidence:'estimated',method:'same_service_interpolation',sourceKind:'derived'};
}

function fallbackEstimate(service,fromNodeId,toNodeId,nodes=[],rules=DEFAULT_RULES){
  const km=segmentDistanceKm(service,fromNodeId,toNodeId,nodes);
  const buckets=rules[service.mode]||rules.route_taxi;
  const bucket=buckets.find(item=>!Number.isFinite(km)||km<=item.maxKm)||buckets.at(-1);
  return {minTTD:bucket.min,maxTTD:bucket.max,confidence:'estimated',method:Number.isFinite(km)?'mode_distance_range':'mode_fallback_range',sourceKind:'model',distanceKm:Number.isFinite(km)?km:null};
}

export function fareForSegment({service,fromNodeId,toNodeId,fares=[],nodes=[],rules=DEFAULT_RULES}){
  if(!service)return null;
  const exact=exactRecord(fares,service,fromNodeId,toNodeId);
  if(exact)return {...exact,sourceKind:'fare_record'};
  const legacy=legacyFullFare(service,fromNodeId,toNodeId);
  if(legacy)return legacy;
  const interpolated=interpolateFromFullFare(service,fromNodeId,toNodeId,nodes);
  if(interpolated)return interpolated;
  return fallbackEstimate(service,fromNodeId,toNodeId,nodes,rules);
}

export function fareForJourney(steps,{fares=[],nodes=[],rules=DEFAULT_RULES}={}){
  let minTTD=0,maxTTD=0,hasTransit=false,allExact=true;
  const legs=[];
  for(const step of steps||[]){
    if(step.kind!=='transit')continue;
    hasTransit=true;
    const fare=fareForSegment({service:step.service,fromNodeId:step.from,toNodeId:step.to,fares,nodes,rules});
    if(!fare)continue;
    minTTD+=fare.minTTD;maxTTD+=fare.maxTTD;
    if(fare.confidence==='estimated')allExact=false;
    legs.push({serviceId:step.service.id,fromNodeId:step.from,toNodeId:step.to,...fare});
  }
  if(!hasTransit)return null;
  return {minTTD:roundFare(minTTD),maxTTD:roundFare(maxTTD),confidence:allExact?'known_or_reported':'includes_estimate',legs};
}

export function formatFare(fare,{prefixEstimate=true}={}){
  if(!fare)return'Fare unavailable';
  const exact=fare.minTTD===fare.maxTTD;
  const prefix=prefixEstimate&&fare.confidence==='estimated'?'Est. ':'';
  return exact?`${prefix}TT$${Number(fare.minTTD).toFixed(fare.minTTD%1?1:0)}`:`${prefix}TT$${Number(fare.minTTD).toFixed(fare.minTTD%1?1:0)}–${Number(fare.maxTTD).toFixed(fare.maxTTD%1?1:0)}`;
}

export function coverageReport(services,{fares=[],nodes=[],includeNeedsReview=false}={}){
  const counts={official_current:0,community_verified:0,reported_current:0,legacy_current:0,estimated:0,missing:0,total:0};
  const entries=[];
  for(const service of services||[]){
    if(!includeNeedsReview&&service.serviceConfidence==='needs_review')continue;
    const stops=service.stopNodeIds||[];
    for(let i=0;i<stops.length-1;i++)for(let j=i+1;j<stops.length;j++){
      counts.total+=1;
      const fare=fareForSegment({service,fromNodeId:stops[i],toNodeId:stops[j],fares,nodes});
      if(!fare){counts.missing+=1;entries.push({serviceId:service.id,fromNodeId:stops[i],toNodeId:stops[j],confidence:'missing'});continue;}
      counts[fare.confidence]=(counts[fare.confidence]||0)+1;
      entries.push({serviceId:service.id,fromNodeId:stops[i],toNodeId:stops[j],confidence:fare.confidence,method:fare.method,minTTD:fare.minTTD,maxTTD:fare.maxTTD});
    }
  }
  return {counts,displayCoveragePct:counts.total?Math.round((counts.total-counts.missing)*1000/counts.total)/10:100,entries};
}

export {DEFAULT_RULES};
