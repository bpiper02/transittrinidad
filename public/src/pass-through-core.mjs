import {kmBetween} from './routing-core.mjs';

const PASS_THROUGH_POLICIES=new Set(['main_road_pass_through','hail_along_segment','continuous_pickup']);
const BLOCKED_NODE_KINDS=new Set(['highway_point','motorway_point','overpass','private_access']);
const DEFAULT_MAX_ACCESS_KM=1.2;

function validLocation(location){
  return Boolean(location&&Number.isFinite(location.lat)&&Number.isFinite(location.lng));
}

function nodeFor(nodes,id){
  return nodes instanceof Map?nodes.get(id):(nodes||[]).find(node=>node.id===id);
}

function localPoint(location,referenceLat){
  const radians=Math.PI/180;
  const lng=location.lng??location.lon;
  return{x:6371*lng*radians*Math.cos(referenceLat*radians),y:6371*location.lat*radians};
}

function pointFromLngLat(lng,lat){return{lat,lng};}

export function routeAllowsPassThrough(service){
  return PASS_THROUGH_POLICIES.has(service?.boardingPolicy)||PASS_THROUGH_POLICIES.has(service?.alightingPolicy);
}

export function segmentAllowsBoarding(segment={},service={}){
  const policy=segment.boardingPolicy||service.boardingPolicy;
  return PASS_THROUGH_POLICIES.has(policy)&&segment.accessStatus!=='unsafe_or_blocked';
}

export function segmentAllowsAlighting(segment={},service={}){
  const policy=segment.alightingPolicy||service.alightingPolicy||segment.boardingPolicy||service.boardingPolicy;
  return PASS_THROUGH_POLICIES.has(policy)&&segment.accessStatus!=='unsafe_or_blocked';
}

export function routePassThroughSegments(service={},nodes,{role='boarding'}={}){
  const raw=Array.isArray(service.passThroughSegments)?service.passThroughSegments:[];
  if(!raw.length&&!routeAllowsPassThrough(service))return[];
  const segments=raw.length?raw:[{fromNodeId:service.originNodeId,toNodeId:service.destinationNodeId,confidence:'service_policy'}];
  return segments.map(segment=>{
    const from=nodeFor(nodes,segment.fromNodeId),to=nodeFor(nodes,segment.toNodeId);
    return{...segment,from,to};
  }).filter(segment=>{
    if(!validLocation(segment.from?.location)||!validLocation(segment.to?.location))return false;
    if(BLOCKED_NODE_KINDS.has(segment.from.kind)||BLOCKED_NODE_KINDS.has(segment.to.kind))return false;
    return role==='alighting'?segmentAllowsAlighting(segment,service):segmentAllowsBoarding(segment,service);
  });
}

export function projectPointToSegment(point,fromLocation,toLocation){
  if(!validLocation(point)||!validLocation(fromLocation)||!validLocation(toLocation))return null;
  const referenceLat=(point.lat+fromLocation.lat+toLocation.lat)/3;
  const p=localPoint(point,referenceLat),a=localPoint(fromLocation,referenceLat),b=localPoint(toLocation,referenceLat);
  const dx=b.x-a.x,dy=b.y-a.y,lengthSquared=dx*dx+dy*dy;
  const t=lengthSquared?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/lengthSquared)):0;
  const lng=fromLocation.lng+(toLocation.lng-fromLocation.lng)*t;
  const lat=fromLocation.lat+(toLocation.lat-fromLocation.lat)*t;
  const location=pointFromLngLat(lng,lat);
  return{location,t,distanceKm:kmBetween(point,location)};
}

export function virtualAccessPointForSegment(place,service,segment,{role='boarding',maxAccessKm=DEFAULT_MAX_ACCESS_KM}={}){
  const projection=projectPointToSegment(place,segment.from.location,segment.to.location);
  if(!projection||projection.distanceKm>maxAccessKm)return null;
  const pointKind=role==='alighting'?'virtual_alighting_area':'virtual_boarding_area';
  return{
    id:`${pointKind}:${service.id}:${segment.from.id}:${segment.to.id}`,
    name:role==='alighting'?'Approximate alighting area':'Approximate boarding area',
    kind:pointKind,
    serviceId:service.id,
    corridorId:service.corridorId||null,
    mode:service.mode||null,
    fromNodeId:segment.from.id,
    toNodeId:segment.to.id,
    role,
    location:projection.location,
    lat:projection.location.lat,
    lng:projection.location.lng,
    distanceKm:projection.distanceKm,
    segmentPosition:projection.t,
    confidence:segment.confidence||'mapped_corridor',
    safetyNote:segment.safetyNote||'Use a safe visible point on the main road. Prefer junctions, marked stops, stands, or places where vehicles commonly stop.',
    accessLabel:role==='alighting'?'Estimated drop-off area':'Estimated main-road boarding area'
  };
}

export function virtualAccessCandidates(place,services=[],nodes,{
  role='boarding',
  maxAccessKm=DEFAULT_MAX_ACCESS_KM,
  limit=5
}={}){
  if(!validLocation(place))return[];
  const candidates=[];
  for(const service of services){
    if(service?.serviceConfidence==='needs_review')continue;
    for(const segment of routePassThroughSegments(service,nodes,{role})){
      const candidate=virtualAccessPointForSegment(place,service,segment,{role,maxAccessKm});
      if(candidate)candidates.push(candidate);
    }
  }
  return candidates.sort((a,b)=>a.distanceKm-b.distanceKm||String(a.serviceId).localeCompare(String(b.serviceId))).slice(0,limit);
}
