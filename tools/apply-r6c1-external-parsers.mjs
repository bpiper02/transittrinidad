import {readFileSync,writeFileSync} from 'node:fs';

const path=new URL('../public/app-v2.js',import.meta.url);
let source=readFileSync(path,'utf8');

function replaceOnce(label,before,after){
  const first=source.indexOf(before);
  if(first<0)throw new Error(`${label}: expected source block not found`);
  if(source.indexOf(before,first+before.length)>=0)throw new Error(`${label}: source block appears more than once`);
  source=source.replace(before,after);
}

replaceOnce(
  'external parser import',
  "import {fetchWithTimeout,getJson} from './src/http-core.mjs';\n",
  "import {fetchWithTimeout,getJson} from './src/http-core.mjs';\nimport {parseNominatimPlace,parseOsrmRoute,parsePhotonFeatures} from './src/external-data-core.mjs';\n"
);

replaceOnce(
  'photon response parsing',
  "  const data=await response.json();\n  return(data.features||[]).map(feature=>{const[lng,lat]=feature.geometry?.coordinates||[];return{name:photonLabel(feature.properties),lat:+lat,lng:+lng};}).filter(place=>place.name&&Number.isFinite(place.lat)&&Number.isFinite(place.lng)&&inTT(place.lng,place.lat));",
  "  const data=await response.json();\n  return parsePhotonFeatures(data).map(feature=>({name:photonLabel(feature.properties),lat:feature.lat,lng:feature.lng})).filter(place=>place.name&&inTT(place.lng,place.lat));"
);

replaceOnce(
  'nominatim response parsing',
  "  const rows=await response.json();if(!rows.length)throw new Error(`Could not find “${cleaned}”.`);\n  const point={name:rows[0].display_name,lat:+rows[0].lat,lng:+rows[0].lon};cache[key]=point;writeGeoCache(cache);return point;",
  "  const point=parseNominatimPlace(await response.json());if(!point)throw new Error(`Could not find “${cleaned}”.`);\n  cache[key]=point;writeGeoCache(cache);return point;"
);

replaceOnce(
  'osrm response parsing',
  "  try{const response=await fetchWithTimeout(url,{},6000);if(!response.ok)return;const data=await response.json(),route=data?.routes?.[0];if(!route?.geometry?.coordinates?.length)return;const value={coordinates:route.geometry.coordinates,durationSeconds:route.duration,distanceMeters:route.distance};displayGeometry.set(service.id,{...value,source:'osrm'});cache[key]=value;writeRoadCache(cache);}catch(error){console.warn('Road geometry unavailable for',service.id,error);}",
  "  try{const response=await fetchWithTimeout(url,{},6000);if(!response.ok)return;const value=parseOsrmRoute(await response.json());if(!value)return;displayGeometry.set(service.id,{...value,source:'osrm'});cache[key]=value;writeRoadCache(cache);}catch(error){console.warn('Road geometry unavailable for',service.id,error);}"
);

writeFileSync(path,source);
console.log('R6c1 external response parser integration applied');
