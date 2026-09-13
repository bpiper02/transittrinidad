import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const publicDir=join(root,'public');
const srcDir=join(root,'src');
const read=path=>readFileSync(path,'utf8');

const index=read(join(publicDir,'index.html'));
assert.match(index,/src=["']\.\/app-v2\.js["']/,'public/index.html must load the current rider application entrypoint');
assert.doesNotMatch(index,/src=["']\.\/app\.js["']/,'public/index.html must not load the legacy app.js entrypoint');

for(const pageName of readdirSync(publicDir).filter(name=>name.endsWith('.html'))){
  const html=read(join(publicDir,pageName));
  assert.doesNotMatch(html,/src=["']\.\/app\.js["']/u,`${pageName} must not load legacy app.js`);
}

const browserMirrorModules=[
  'fare-core.mjs',
  'field-review-core.mjs',
  'http-core.mjs',
  'network-qa-core.mjs',
  'place-core.mjs',
  'presentation-core.mjs',
  'rider-instruction-core.mjs',
  'routing-core.mjs',
  'schedule-core.mjs',
  'storage-core.mjs'
];
for(const moduleName of browserMirrorModules){
  assert.equal(
    read(join(publicDir,'src',moduleName)),
    read(join(srcDir,moduleName)),
    `${moduleName} browser mirror must exactly match canonical src`
  );
}

const browserRuntimeFiles=readdirSync(publicDir)
  .filter(name=>/\.(?:js|html)$/u.test(name))
  .map(name=>[name,read(join(publicDir,name))]);
for(const [name,contents] of browserRuntimeFiles){
  assert.doesNotMatch(contents,/['"]\.\/routing-core\.mjs['"]/u,`${name} must import canonical browser mirrors from ./src, not legacy public/routing-core.mjs`);
}

console.log(`architecture contract passed: ${browserMirrorModules.length} canonical browser mirrors locked`);
