import assert from 'node:assert/strict';
import {fetchWithTimeout,getJson} from '../src/http-core.mjs';

let receivedOptions;
const success=await fetchWithTimeout('/ok',{headers:{Accept:'application/json'}},7000,{
  fetchImpl:async(url,options)=>{assert.equal(url,'/ok');receivedOptions=options;return{ok:true,status:200};}
});
assert.equal(success.ok,true);
assert.equal(receivedOptions.headers.Accept,'application/json');
assert.ok(receivedOptions.signal,'adapter must supply an abort signal');

let cleared=false;
await assert.rejects(
  ()=>fetchWithTimeout('/slow',{},5,{
    fetchImpl:async(_url,{signal})=>{if(signal.aborted)throw new Error('aborted');throw new Error('unexpected');},
    setTimeoutImpl:callback=>{callback();return 1;},
    clearTimeoutImpl:()=>{cleared=true;}
  }),
  /Request timed out\./
);
assert.equal(cleared,true,'timeout timer must be cleared');

const external=new AbortController();
external.abort();
await assert.rejects(
  ()=>fetchWithTimeout('/abort',{signal:external.signal},7000,{
    fetchImpl:async(_url,{signal})=>{assert.equal(signal.aborted,true);throw new DOMException('Aborted','AbortError');}
  }),
  error=>error?.name==='AbortError'
);

const payload=await getJson('/data',{fetcher:async(url,options,timeoutMs)=>{
  assert.equal(url,'/data');assert.equal(options.cache,'no-cache');assert.equal(timeoutMs,7000);
  return{ok:true,status:200,json:async()=>({hello:'world'})};
}});
assert.deepEqual(payload,{hello:'world'});

await assert.rejects(
  ()=>getJson('/missing',{fetcher:async()=>({ok:false,status:404})}),
  /\/missing returned 404/
);

console.log('http core tests passed');
