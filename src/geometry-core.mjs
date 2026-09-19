function validPoint(point){return Array.isArray(point)&&point.length>=2&&Number.isFinite(point[0])&&Number.isFinite(point[1]);}

export function orderedStopIds(service={}){
  const stops=Array.isArray(service.stopNodeIds)?service.stopNodeIds.filter(Boolean):[];
  return stops.length>=2?stops:[service.originNodeId,service.destinationNodeId].filter(Boolean);
}

export function orderedStopCoordinates(service,nodes){
  return orderedStopIds(service).map(id=>{
    const location=nodes?.get?.(id)?.location;
    return location&&Number.isFinite(location.lng)&&Number.isFinite(location.lat)?[location.lng,location.lat]:null;
  }).filter(Boolean);
}

export function hasKnownCorridor(service={}){
  const stops=orderedStopIds(service);
  const wording=[service.boardingNote,service.alightingNote,service.operator,service.description,service.road].filter(Boolean).join(' ').toLowerCase();
  return stops.length>=3||service.patternType==='local'||['corridor_hail','hail_along_segment','mixed'].includes(service.boardingPolicy)||['corridor_request','main_road_pass_through','mixed'].includes(service.alightingPolicy)||/corridor|main road|southern main/.test(wording);
}

export function geometryPlan(service,nodes,{snapped=null}={}){
  const explicit=Array.isArray(service.geometry)&&service.geometry.length>=2
    ? service.geometry.map(point=>[point.lng,point.lat]).filter(validPoint):[];
  if(explicit.length>=2)return{coordinates:explicit,kind:service.geometryConfidence==='verified_path'?'verified':'trusted',label:service.geometryConfidence==='verified_path'?'Verified path':'Trusted route shape',needsRoadSnap:false};
  const stops=orderedStopCoordinates(service,nodes);
  const corridor=hasKnownCorridor(service);
  if(corridor&&stops.length>=2){
    if(Array.isArray(snapped?.coordinates)&&snapped.coordinates.length>=2)return{coordinates:snapped.coordinates,kind:'snapped_corridor',label:'Approx. road-snapped corridor',needsRoadSnap:false};
    return{coordinates:stops,kind:'corridor',label:'Approx. corridor / route shape',needsRoadSnap:true};
  }
  if(Array.isArray(snapped?.coordinates)&&snapped.coordinates.length>=2)return{coordinates:snapped.coordinates,kind:'estimated',label:'Estimated road path',needsRoadSnap:false};
  if(stops.length>=2)return{coordinates:[stops[0],stops.at(-1)],kind:'connector',label:'Approx. endpoint connector',needsRoadSnap:true};
  return null;
}

export function osrmWaypointCoordinates(service,nodes){
  const stops=orderedStopCoordinates(service,nodes);
  return hasKnownCorridor(service)&&stops.length>=2?stops:(stops.length>=2?[stops[0],stops.at(-1)]:[]);
}

export function isEquivalentPattern(a,b,nodes){
  const aPlan=geometryPlan(a,nodes),bPlan=geometryPlan(b,nodes);
  if(!aPlan||!bPlan||a.mode!==b.mode||aPlan.kind!==bPlan.kind)return false;
  const same=(x,y)=>x.length===y.length&&x.every((point,index)=>point[0]===y[index][0]&&point[1]===y[index][1]);
  return same(aPlan.coordinates,bPlan.coordinates);
}
