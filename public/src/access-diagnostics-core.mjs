import {kmBetween} from './routing-core.mjs';
import {virtualAccessCandidates} from './pass-through-core.mjs';

const FORMAL_ACCESS_KINDS=new Set(['terminal','stand','station','ferry_terminal','water_taxi_terminal']);
const UNSAFE_NODE_KINDS=new Set(['highway_point','motorway_point','overpass','private_access']);

export function hasPointLocation(value){
  return Boolean(value?.location&&Number.isFinite(value.location.lat)&&Number.isFinite(value.location.lng));
}

export function nodeAccessKind(node){
  if(!node)return'unknown';
  if(UNSAFE_NODE_KINDS.has(node.kind))return'unsafe';
  if(FORMAL_ACCESS_KINDS.has(node.kind))return'formal';
  if(node.kind==='virtual_boarding_area'||node.kind==='virtual_alighting_area')return'pass_through_area';
  if(node.kind==='junction'||node.kind==='town_center')return'main_road';
  if(node.kind==='stop_zone'&&node.locationConfidence==='approximate_area')return'approximate_area';
  if(node.kind==='stop_zone')return'mapped_stop_zone';
  return'local_node';
}

export function accessSafetyLabel(accessKind){
  if(accessKind==='formal')return'Best: formal stand or terminal';
  if(accessKind==='pass_through_area')return'Estimated main-road boarding area';
  if(accessKind==='main_road')return'Likely main-road access';
  if(accessKind==='mapped_stop_zone')return'Mapped stop zone';
  if(accessKind==='approximate_area')return'Approximate area';
  if(accessKind==='unsafe')return'Not safe for automatic routing';
  return'Nearby transport node';
}

export function accessScore({distanceKm,accessKind,usedByCount=0}){
  const kindBonus={formal:42,pass_through_area:32,main_road:28,mapped_stop_zone:18,local_node:10,approximate_area:-8,unsafe:-999,unknown:-50}[accessKind]??0;
  const serviceBonus=Math.min(20,usedByCount*4);
  const distancePenalty=Math.max(0,distanceKm)*8;
  return kindBonus+serviceBonus-distancePenalty;
}

export function serviceUsageByNode(services=[]){
  const counts=new Map();
  for(const service of services){
    if(service?.serviceConfidence==='needs_review')continue;
    for(const nodeId of [service.originNodeId,service.destinationNodeId,...(service.stopNodeIds||[])]){
      if(!nodeId)continue;
      counts.set(nodeId,(counts.get(nodeId)||0)+1);
    }
  }
  return counts;
}

function fixedAccessCandidates(place,nodes,services=[],{maxKm=4,includeUnsafe=false}={}){
  const usage=serviceUsageByNode(services);
  return[...(nodes instanceof Map?nodes.values():nodes||[])]
    .filter(hasPointLocation)
    .map(node=>{
      const distanceKm=kmBetween(place,node.location);
      const accessKind=nodeAccessKind(node);
      const usedByCount=usage.get(node.id)||0;
      return{
        nodeId:node.id,
        name:node.name||node.id,
        kind:node.kind||'unknown',
        accessKind,
        distanceKm,
        usedByCount,
        safetyLabel:accessSafetyLabel(accessKind),
        score:accessScore({distanceKm,accessKind,usedByCount}),
        location:node.location,
        source:'fixed_node'
      };
    })
    .filter(candidate=>candidate.distanceKm<=maxKm)
    .filter(candidate=>includeUnsafe||candidate.accessKind!=='unsafe');
}

function virtualPassThroughCandidates(place,nodes,services=[],{role='boarding',maxKm=1.2}={}){
  return virtualAccessCandidates(place,services,nodes,{role,maxAccessKm:maxKm,limit:20}).map(candidate=>({
    nodeId:candidate.id,
    name:candidate.name,
    kind:candidate.kind,
    accessKind:'pass_through_area',
    distanceKm:candidate.distanceKm,
    usedByCount:1,
    safetyLabel:accessSafetyLabel('pass_through_area'),
    score:accessScore({distanceKm:candidate.distanceKm,accessKind:'pass_through_area',usedByCount:1}),
    location:candidate.location,
    source:'virtual_pass_through',
    serviceId:candidate.serviceId,
    corridorId:candidate.corridorId,
    mode:candidate.mode,
    safetyNote:candidate.safetyNote,
    confidence:candidate.confidence,
    segmentPosition:candidate.segmentPosition,
    fromNodeId:candidate.fromNodeId,
    toNodeId:candidate.toNodeId
  }));
}

export function nearbyAccessCandidates(place,nodes,services=[],{
  limit=5,
  maxKm=4,
  includeUnsafe=false,
  includePassThrough=false,
  passThroughMaxKm=1.2,
  role='boarding'
}={}){
  if(!place||!Number.isFinite(place.lat)||!Number.isFinite(place.lng))return[];
  const candidates=fixedAccessCandidates(place,nodes,services,{maxKm,includeUnsafe});
  if(includePassThrough)candidates.push(...virtualPassThroughCandidates(place,nodes,services,{role,maxKm:passThroughMaxKm}));
  return candidates
    .sort((a,b)=>b.score-a.score||a.distanceKm-b.distanceKm||String(a.name).localeCompare(String(b.name)))
    .slice(0,limit);
}

export function accessSummary(place,nodes,services=[],options={}){
  const candidates=nearbyAccessCandidates(place,nodes,services,options);
  const best=candidates[0]||null;
  const certainty=best?.accessKind==='formal'?'high':best?.accessKind==='pass_through_area'||best?.accessKind==='main_road'||best?.accessKind==='mapped_stop_zone'?'medium':best?'low':'none';
  return{
    placeName:place?.name||'Selected place',
    certainty,
    best,
    candidates,
    hasUsableAccess:Boolean(best&&best.accessKind!=='unsafe')
  };
}
