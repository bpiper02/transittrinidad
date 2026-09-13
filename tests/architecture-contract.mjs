import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLIC_MODULE_FILES} from '../tools/public-artifacts.mjs';

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

for(const moduleName of PUBLIC_MODULE_FILES){
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
  assert.doesNotMatch(contents,/['"]\.\/routing-core\.mjs['"]/u,`${name} must import generated browser modules from ./src, not legacy public/routing-core.mjs`);
}

console.log(`architecture contract passed: ${PUBLIC_MODULE_FILES.length} generated browser modules locked`);
