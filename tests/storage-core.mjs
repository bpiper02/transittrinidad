import assert from 'node:assert/strict';
import {isPlainObject,readJsonObjectStorage,readJsonStorage,writeJsonStorage} from '../src/storage-core.mjs';

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

// General JSON storage still accepts valid JSON primitives/arrays.
assert.equal(readJsonStorage(memoryStorage({value:'null'}),'value',{fallback:{}}),null);
assert.deepEqual(readJsonStorage(memoryStorage({value:'[]'}),'value',{fallback:{}}),[]);

// Cache callers require dictionary-like objects; valid-but-wrong JSON shapes fall back safely.
assert.equal(isPlainObject({}),true);
assert.equal(isPlainObject(Object.create(null)),true);
assert.equal(isPlainObject(null),false);
assert.equal(isPlainObject([]),false);
assert.deepEqual(readJsonObjectStorage(memoryStorage({value:'null'}),'value',{fallback:{safe:true}}),{safe:true});
assert.deepEqual(readJsonObjectStorage(memoryStorage({value:'[]'}),'value',{fallback:{safe:true}}),{safe:true});
assert.deepEqual(readJsonObjectStorage(memoryStorage({value:'{"a":1}'}),'value',{fallback:{}}),{a:1});

console.log('storage core tests passed');
