import assert from 'node:assert/strict';
import {RUNTIME_DATA_KEYS,validateRuntimeData} from '../src/runtime-data-core.mjs';

const valid={nodes:[],services:[],transfers:[],schedules:[],places:[],fares:[]};
assert.equal(validateRuntimeData(valid),valid,'validator should preserve the original validated object');
assert.deepEqual(RUNTIME_DATA_KEYS,['nodes','services','transfers','schedules','places','fares']);

for(const key of RUNTIME_DATA_KEYS){
  const invalid={...valid,[key]:{}};
  assert.throws(()=>validateRuntimeData(invalid),new TypeError(`Invalid runtime dataset: ${key}`));
}
assert.throws(()=>validateRuntimeData(null),new TypeError('Invalid runtime dataset container.'));
assert.throws(()=>validateRuntimeData([]),new TypeError('Invalid runtime dataset container.'));

const before=JSON.stringify(valid);
validateRuntimeData(valid);
assert.equal(JSON.stringify(valid),before,'validation must not mutate runtime data');

console.log('runtime data validation tests passed');
