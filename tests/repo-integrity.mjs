import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLIC_DATA_FILES,PUBLIC_MODULE_FILES} from '../tools/public-artifacts.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=path=>readFileSync(path,'utf8');

for(const file of PUBLIC_DATA_FILES){
  assert.equal(
    read(join(root,'public','data',file)),
    read(join(root,'data',file)),
    `${file} browser mirror must exactly match canonical data`
  );
}
for(const file of PUBLIC_MODULE_FILES){
  assert.equal(
    read(join(root,'public','src',file)),
    read(join(root,'src',file)),
    `${file} browser mirror must exactly match canonical source`
  );
}

assert.deepEqual(
  readdirSync(join(root,'public','src')).filter(name=>!name.startsWith('.')).sort(),
  [...PUBLIC_MODULE_FILES].sort(),
  'public/src must contain only manifest-declared generated modules'
);
assert.deepEqual(
  readdirSync(join(root,'public','data')).filter(name=>!name.startsWith('.')).sort(),
  [...PUBLIC_DATA_FILES].sort(),
  'public/data must contain only manifest-declared generated data files'
);

console.log(`repo integrity tests passed: ${PUBLIC_MODULE_FILES.length} modules, ${PUBLIC_DATA_FILES.length} data files`);
