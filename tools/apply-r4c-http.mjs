import {readFileSync,writeFileSync} from 'node:fs';

// Temporary, fail-closed R4c source transformation.
const path=new URL('../public/app-v2.js',import.meta.url);
let source=readFileSync(path,'utf8');

function replaceOnce(label,before,after=''){
  const first=source.indexOf(before);
  if(first<0)throw new Error(`${label}: expected source block not found`);
  if(source.indexOf(before,first+before.length)>=0)throw new Error(`${label}: source block appears more than once`);
  source=source.replace(before,after);
}

replaceOnce(
  'http import',
  "import {readJsonStorage,writeJsonStorage} from './src/storage-core.mjs';\n",
  "import {readJsonStorage,writeJsonStorage} from './src/storage-core.mjs';\nimport {fetchWithTimeout,getJson} from './src/http-core.mjs';\n"
);

replaceOnce(
  'http helpers',
  "async function fetchWithTimeout(url,options={},timeoutMs=7000){\n  const controller=new AbortController();\n  const external=options.signal;\n  const forwardAbort=()=>controller.abort();\n  if(external){if(external.aborted)controller.abort();else external.addEventListener('abort',forwardAbort,{once:true});}\n  let timedOut=false;\n  const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);\n  try{return await fetch(url,{...options,signal:controller.signal});}\n  catch(error){if(timedOut)throw new Error('Request timed out.');throw error;}\n  finally{clearTimeout(timer);external?.removeEventListener('abort',forwardAbort);}\n}\nasync function getJson(url){const response=await fetchWithTimeout(url,{cache:'no-cache'},7000);if(!response.ok)throw new Error(`${url} returned ${response.status}`);return response.json();}\n\n"
);

writeFileSync(path,source);
console.log('R4c HTTP extraction applied');
