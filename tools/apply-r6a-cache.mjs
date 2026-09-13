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
  'storage import',
  "import {readJsonStorage,writeJsonStorage} from './src/storage-core.mjs';",
  "import {readJsonObjectStorage,writeJsonStorage} from './src/storage-core.mjs';"
);
replaceOnce(
  'geocode cache reader',
  "function readGeoCache(){return readJsonStorage(localStorage,GEOCODE_CACHE_KEY,{fallback:{}});}",
  "function readGeoCache(){return readJsonObjectStorage(localStorage,GEOCODE_CACHE_KEY,{fallback:{}});}"
);
replaceOnce(
  'road cache reader',
  "function readRoadCache(){return readJsonStorage(localStorage,OSRM_CACHE_KEY,{fallback:{}});}",
  "function readRoadCache(){return readJsonObjectStorage(localStorage,OSRM_CACHE_KEY,{fallback:{}});}"
);

writeFileSync(path,source);
console.log('R6a cache hardening applied');
