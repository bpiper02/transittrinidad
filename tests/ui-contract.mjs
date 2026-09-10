import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

for (const id of ['appShell','map','serviceList','serviceCount','modeTabs','detailPanel','fromInput','toInput','planButton','swapButton','plannerStatus']) {
  assert.match(html,new RegExp(`id=["']${id}["']`),`missing #${id}`);
}
assert.match(html,/FIND ROUTE/);
assert.match(html,/maplibre-gl@6\.8\.0/);
assert.doesNotMatch(html,/leaflet/i,'Leaflet should be removed from the runtime shell');
assert.match(app,/new maplibregl\.Map/);
assert.match(app,/https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
assert.match(app,/findDirectService/);
assert.match(app,/fitCountry/);
assert.match(app,/nominatim\.openstreetmap\.org\/search/,'place search should use the explicit geocoder endpoint');
assert.match(app,/countrycodes:'tt'/,'geocoder must be restricted to Trinidad and Tobago');
assert.match(app,/bounded:'1'/,'geocoder must use bounded country search');
assert.match(app,/1100-\(Date\.now\(\)-lastGeocodeAt\)/,'public geocoder requests must be rate limited');
assert.match(app,/localStorage\.setItem\(GEOCODE_CACHE_KEY/,'geocoder results should be cached locally');
assert.doesNotMatch(app,/input.*addEventListener\(['"]input/,'do not implement public Nominatim autocomplete');
assert.match(app,/nearestNode/,'arbitrary places should resolve to nearest known transport nodes');
assert.match(css,/html,body\{[^}]*height:100%[^}]*overflow:hidden/,'map app must not depend on document scrolling');
assert.match(css,/\.app-shell\{position:fixed;inset:0;overflow:hidden\}/);
assert.match(css,/\.map\{position:absolute;inset:0;width:100%;height:100%\}/);

console.log('ui contract tests passed');
