import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [app,css,rootNodes,rootServices,publicNodes,publicServices,rootRouting,publicRouting]=await Promise.all([
  readFile(new URL('../public/app.js',import.meta.url),'utf8'),
  readFile(new URL('../public/styles.css',import.meta.url),'utf8'),
  readFile(new URL('../data/nodes.json',import.meta.url),'utf8'),
  readFile(new URL('../data/services.json',import.meta.url),'utf8'),
  readFile(new URL('../public/data/nodes.json',import.meta.url),'utf8'),
  readFile(new URL('../public/data/services.json',import.meta.url),'utf8'),
  readFile(new URL('../src/routing-core.mjs',import.meta.url),'utf8'),
  readFile(new URL('../public/src/routing-core.mjs',import.meta.url),'utf8')
]);

assert.match(app,/getJson\('\.\/data\/nodes\.json'\)/);
assert.match(app,/getJson\('\.\/data\/services\.json'\)/);
assert.match(app,/maplibregl\.Map/);
assert.doesNotMatch(app,/\bL\.map\b|invalidateSize|ResizeObserver/);
assert.match(app,/journey-transit/);
assert.match(app,/chooseConnectedJourney/);
assert.match(app,/autocompletePlaces/);
assert.match(css,/html,body\{[^}]*height:100%[^}]*overflow:hidden/);
assert.match(css,/\.app-shell\{position:fixed;inset:0;overflow:hidden\}/);
assert.match(css,/\.map\{[^}]*position:absolute[^}]*left:390px/);
assert.match(css,/@media\(max-width:760px\)/);
assert.deepEqual(JSON.parse(publicNodes),JSON.parse(rootNodes),'public nodes must match canonical data');
assert.deepEqual(JSON.parse(publicServices),JSON.parse(rootServices),'public services must match canonical data');
assert.equal(publicRouting,rootRouting,'browser routing core must match canonical routing core');

console.log('atlas UI contract tests passed');
