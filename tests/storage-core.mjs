import assert from 'node:assert/strict';
import {readJsonStorage,writeJsonStorage} from '../src/storage-core.mjs';

function memoryStorage(initial={}){
  const data=new Map(Object.entries(initial));
  return{
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,value),
    value:key=>data.get(key)
  };
}

const storage=memoryStorage();
assert.deepEqual(readJsonStorage(storage,'missing',{fallback:{}}),{});
assert.equal(writeJsonStorage(storage,'object',{a:1}),true);
assert.deepEqual(readJsonStorage(storage,'object',{fallback:{}}),{a:1});

const malformed=memoryStorage({bad:'{not-json'});
assert.deepEqual(readJsonStorage(malformed,'bad',{fallback:{safe:true}}),{safe:true});

const throwing={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
assert.deepEqual(readJsonStorage(throwing,'x',{fallback:{}}),{});
assert.equal(writeJsonStorage(throwing,'x',{a:1}),false);

// Characterization: valid JSON null/arrays currently pass through. R6 will decide
// whether cache-specific callers should reject these shapes as malformed caches.
assert.equal(readJsonStorage(memoryStorage({value:'null'}),'value',{fallback:{}}),null);
assert.deepEqual(readJsonStorage(memoryStorage({value:'[]'}),'value',{fallback:{}}),[]);

console.log('storage core tests passed');
