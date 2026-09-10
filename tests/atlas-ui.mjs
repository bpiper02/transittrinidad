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
assert.match(app, /observer\.observe\(mapPanel\)/, 'ResizeObserver must observe the stable map panel, not the Leaflet child');
assert.match(app, /zoomAnimation:false/, 'map zoom animation must be disabled while atlas layout is being stabilized');
assert.match(app, /keepBuffer:4/, 'tile layer should keep a larger tile buffer while scrolling/resizing');
assert.match(css, /overflow-x:hidden/, 'page must prevent accidental horizontal overflow');
assert.match(css, /\.atlas-shell\{[^}]*height:72vh[^}]*overflow:hidden/, 'desktop atlas must have a stable bounded viewport');
assert.match(css, /\.map\{position:relative;[^}]*height:100%/, 'Leaflet map must participate in normal flow inside the stable panel');
assert.doesNotMatch(css, /\.map\{position:absolute/, 'Leaflet map must not use the old absolute-positioned fluid layout');
assert.match(css, /\.atlas-sidebar\{[^}]*overflow-y:auto/, 'service list must scroll internally instead of stretching the map');
assert.match(css, /\.detail-panel\{[^}]*overflow-y:auto/, 'route detail must scroll internally instead of stretching the map');
assert.match(css, /leaflet-tile-pane img\{max-width:none!important;max-height:none!important\}/, 'global image rules must not resize Leaflet tiles');
assert.deepEqual(JSON.parse(publicNodes), JSON.parse(rootNodes), 'public node snapshot must match canonical nodes');
assert.deepEqual(JSON.parse(publicServices), JSON.parse(rootServices), 'public service snapshot must match canonical services');

console.log('atlas UI contract tests passed');
