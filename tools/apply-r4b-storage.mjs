import {readFileSync,writeFileSync} from 'node:fs';

const path=new URL('../public/app-v2.js',import.meta.url);
let source=readFileSync(path,'utf8');

function replaceOnce(label,before,after=''){
  const first=source.indexOf(before);
  if(first<0)throw new Error(`${label}: expected source block not found`);
  if(source.indexOf(before,first+before.length)>=0)throw new Error(`${label}: source block appears more than once`);
  source=source.replace(before,after);
}

replaceOnce(
  'storage import',
  "import {escapeHtml,formatMinutes,maxiBandLabel,modeLabel,routeColor,serviceConfidenceLabel} from './src/presentation-core.mjs';\n",
  "import {escapeHtml,formatMinutes,maxiBandLabel,modeLabel,routeColor,serviceConfidenceLabel} from './src/presentation-core.mjs';\nimport {readJsonStorage,writeJsonStorage} from './src/storage-core.mjs';\n"
);

replaceOnce(
  'cache wrappers',
  "function readGeoCache(){try{return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY)||'{}');}catch{return{};}}\nfunction writeGeoCache(cache){try{localStorage.setItem(GEOCODE_CACHE_KEY,JSON.stringify(cache));}catch{}}\nfunction readRoadCache(){try{return JSON.parse(localStorage.getItem(OSRM_CACHE_KEY)||'{}');}catch{return{};}}\nfunction writeRoadCache(cache){try{localStorage.setItem(OSRM_CACHE_KEY,JSON.stringify(cache));}catch{}}\n",
  "function readGeoCache(){return readJsonStorage(localStorage,GEOCODE_CACHE_KEY,{fallback:{}});}\nfunction writeGeoCache(cache){writeJsonStorage(localStorage,GEOCODE_CACHE_KEY,cache);}\nfunction readRoadCache(){return readJsonStorage(localStorage,OSRM_CACHE_KEY,{fallback:{}});}\nfunction writeRoadCache(cache){writeJsonStorage(localStorage,OSRM_CACHE_KEY,cache);}\n"
);

writeFileSync(path,source);
console.log('R4b storage extraction applied');
