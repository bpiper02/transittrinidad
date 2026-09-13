function isRecord(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function finiteNumber(value){const number=Number(value);return Number.isFinite(number)?number:null;}

export function parsePhotonFeatures(payload){
  if(!Array.isArray(payload?.features))return[];
  const parsed=[];
  for(const feature of payload.features){
    const coordinates=feature?.geometry?.coordinates;
    if(!Array.isArray(coordinates)||coordinates.length<2)continue;
    const lng=finiteNumber(coordinates[0]),lat=finiteNumber(coordinates[1]);
    if(lng===null||lat===null)continue;
    parsed.push({properties:isRecord(feature?.properties)?feature.properties:{},lng,lat});
  }
  return parsed;
}

export function parseNominatimPlace(payload){
  if(!Array.isArray(payload))return null;
  for(const row of payload){
    if(!isRecord(row))continue;
    const lat=finiteNumber(row.lat),lng=finiteNumber(row.lon);
    const name=typeof row.display_name==='string'?row.display_name.trim():'';
    if(!name||lat===null||lng===null)continue;
    return{name,lat,lng};
  }
  return null;
}

export function parseOsrmRoute(payload){
  if(!Array.isArray(payload?.routes))return null;
  for(const route of payload.routes){
    const coordinates=route?.geometry?.coordinates;
    if(!Array.isArray(coordinates)||coordinates.length<2)continue;
    const normalized=[];
    let valid=true;
    for(const point of coordinates){
      if(!Array.isArray(point)||point.length<2){valid=false;break;}
      const lng=finiteNumber(point[0]),lat=finiteNumber(point[1]);
      if(lng===null||lat===null){valid=false;break;}
      normalized.push([lng,lat]);
    }
    if(!valid)continue;
    const duration=finiteNumber(route.duration),distance=finiteNumber(route.distance);
    return{
      coordinates:normalized,
      durationSeconds:duration!==null&&duration>=0?duration:null,
      distanceMeters:distance!==null&&distance>=0?distance:null
    };
  }
  return null;
}
