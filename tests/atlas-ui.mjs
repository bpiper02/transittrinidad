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
assert.match(app, /maplibregl\.Map/, 'atlas must use MapLibre');
assert.doesNotMatch(app, /\bL\.map\b|invalidateSize|ResizeObserver/, 'old Leaflet resize lifecycle must be gone');
assert.match(css, /html,body\{[^}]*height:100%[^}]*overflow:hidden/, 'page must not scroll underneath the map');
assert.match(css, /\.app-shell\{position:fixed;inset:0;overflow:hidden\}/, 'app shell must own the viewport');
assert.match(css, /\.map\{position:absolute;inset:0;width:100%;height:100%\}/, 'map must fill a stable viewport');
assert.deepEqual(JSON.parse(publicNodes), JSON.parse(rootNodes), 'public node snapshot must match canonical nodes');
assert.deepEqual(JSON.parse(publicServices), JSON.parse(rootServices), 'public service snapshot must match canonical services');

console.log('atlas UI contract tests passed');
