import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [app,css,rootNodes,rootServices,publicNodes,publicServices] = await Promise.all([
  readFile(new URL('../public/app.js', import.meta.url),'utf8'),
  readFile(new URL('../public/styles.css', import.meta.url),'utf8'),
  readFile(new URL('../data/nodes.json', import.meta.url),'utf8'),
  readFile(new URL('../data/services.json', import.meta.url),'utf8'),
  readFile(new URL('../public/data/nodes.json', import.meta.url),'utf8'),
  readFile(new URL('../public/data/services.json', import.meta.url),'utf8')
]);

assert.match(app, /getJson\('\.\/data\/nodes\.json'\)/, 'atlas must load nodes from public/data');
assert.match(app, /getJson\('\.\/data\/services\.json'\)/, 'atlas must load services from public/data');
assert.match(app, /invalidateSize/, 'Leaflet map must invalidate size after responsive layout changes');
assert.match(css, /overflow-x:hidden/, 'page must prevent accidental horizontal overflow');
assert.match(css, /leaflet-tile-pane img\{max-width:none!important;max-height:none!important\}/, 'global image rules must not resize Leaflet tiles');
assert.deepEqual(JSON.parse(publicNodes), JSON.parse(rootNodes), 'public node snapshot must match canonical nodes');
assert.deepEqual(JSON.parse(publicServices), JSON.parse(rootServices), 'public service snapshot must match canonical services');

console.log('atlas UI contract tests passed');
