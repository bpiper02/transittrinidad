export function normalizePlaceQuery(value=''){
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}

function searchTerms(place){
  return [place.name,...(place.aliases||[])].map(normalizePlaceQuery).filter(Boolean);
}

export function exactPlace(query,places=[]){
  const target=normalizePlaceQuery(query);
  if(!target)return null;
  return places.find(place=>searchTerms(place).includes(target))||null;
}

export function matchPlaces(query,places=[],{limit=6}={}){
  const target=normalizePlaceQuery(query);
  if(!target)return[];
  const scored=[];
  for(const place of places){
    const terms=searchTerms(place);
    let score=Infinity;
    for(const term of terms){
      if(term===target)score=Math.min(score,0);
      else if(term.startsWith(target))score=Math.min(score,1+(term.length-target.length)/100);
      else if(term.includes(target))score=Math.min(score,2+(term.length-target.length)/100);
    }
    if(Number.isFinite(score))scored.push({place,score});
  }
  return scored.sort((a,b)=>a.score-b.score||a.place.name.localeCompare(b.place.name)).slice(0,limit).map(item=>item.place);
}

export function explicitNetworkNode(query,nodes,places=[]){
  if(exactPlace(query,places))return null;
  const target=normalizePlaceQuery(query);
  if(!target)return null;
  for(const node of nodes.values()){
    if(normalizePlaceQuery(node.name)!==target)continue;
    if(!['terminal','stand','ferry_terminal','water_taxi_terminal','station'].includes(node.kind))continue;
    return node;
  }
  return null;
}

export function placeToPoint(place){
  if(!place?.location)return null;
  return {name:place.name,lat:place.location.lat,lng:place.location.lng,placeId:place.id,routingRadiusKm:place.routingRadiusKm};
}

export function mergePlaceSuggestions(local=[],remote=[],{limit=6}={}){
  const merged=[];
  const seen=new Set();
  const add=item=>{
    const key=`${normalizePlaceQuery(item.name)}|${Number(item.lat).toFixed(4)}|${Number(item.lng).toFixed(4)}`;
    if(seen.has(key))return;
    seen.add(key);
    merged.push(item);
  };
  local.forEach(place=>add({name:place.name,lat:place.location.lat,lng:place.location.lng,placeId:place.id,routingRadiusKm:place.routingRadiusKm,source:'local'}));
  remote.forEach(place=>add({...place,source:place.source||'geocoder'}));
  return merged.slice(0,limit);
}
