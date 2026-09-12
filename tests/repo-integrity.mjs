import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const files=['nodes.json','places.json','services.json','transfers.json','schedules.json','fares.json'];
for(const file of files){
  const canonical=readFileSync(new URL(`../data/${file}`,import.meta.url),'utf8');
  const browser=readFileSync(new URL(`../public/data/${file}`,import.meta.url),'utf8');
  assert.equal(browser,canonical,`${file} browser mirror must exactly match canonical data`);
}
for(const core of ['network-qa-core.mjs','fare-core.mjs']){
  const sourceCore=readFileSync(new URL(`../src/${core}`,import.meta.url),'utf8');
  const browserCore=readFileSync(new URL(`../public/src/${core}`,import.meta.url),'utf8');
  assert.equal(browserCore,sourceCore,`${core} browser core must exactly mirror source core`);
}

console.log('repo integrity tests passed');
