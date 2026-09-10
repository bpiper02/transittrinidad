import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

for(const id of ['appShell','map','serviceList','serviceCount','modeTabs','detailPanel','fromInput','toInput','planButton','swapButton','plannerStatus','fromSuggestions','toSuggestions']){
  assert.match(html,new RegExp(`id=["']${id}["']`),`missing #${id}`);
}
assert.match(html,/maplibre-gl@6\.8\.0/);
assert.doesNotMatch(html,/datalist|placeOptions/,'native datalist must not constrain arbitrary-place search');
assert.match(app,/new maplibregl\.Map/);
assert.match(app,/\.\/src\/routing-core\.mjs/,'browser routing core must be inside public server root');
assert.match(app,/nominatim\.openstreetmap\.org\/search/,'explicit searches retain Nominatim fallback');
assert.match(app,/countrycodes:'tt'/,'fallback geocoder must stay country restricted');
assert.match(app,/photon\.komoot\.io\/api/,'autocomplete should use Photon rather than Nominatim');
assert.match(app,/autocompletePlaces/);
assert.match(app,/bbox:'-61\.98,9\.95,-60\.42,11\.42'/,'autocomplete should be bounded to T&T');
assert.match(app,/routingServices\(\)/,'trip planner must have a mode-aware service set');
assert.match(app,/services:usableServices/,'active mode must constrain graph routing, not only map rendering');
assert.match(app,/chooseConnectedJourney/,'route-aware node selection must remain enabled');
assert.match(app,/candidateLimit:10/,'route-aware snapping should inspect enough nearby terminals as the network grows');
assert.match(app,/maxAccessKm:25/,'route snapping needs a guard against absurdly distant nodes');
assert.match(app,/estimatedMinutes/,'planner should expose a rough ranking/time estimate');
assert.match(app,/router\.project-osrm\.org\/route\/v1\/driving/,'estimated road geometry should use OSRM');
assert.match(app,/OSRM_CACHE_KEY/,'estimated geometry should be cached');
assert.doesNotMatch(app,/fitCountry\(\);\s*hydrateDisplayGeometry\(\)/,'do not prefetch road geometry for the whole network on map load');
assert.match(app,/MAXI_BAND_COLORS/,'maxi routes need statutory band color mapping');
assert.match(app,/routeColor/,'map features should carry route colors');
assert.match(app,/\['get','routeColor'\]/,'rendered journey must use per-service colors');
assert.match(app,/line-join':'round'/,'route lines should use rounded joins');
assert.match(css,/html,body\{[^}]*height:100%[^}]*overflow:hidden/);
assert.match(css,/\.directions-shell\{[^}]*width:390px/);
assert.match(css,/\.map\{[^}]*left:390px/);
assert.match(css,/-apple-system/,'UI should use native system typography');
assert.match(css,/\.suggestions\{/,'autocomplete menu needs styled results');

console.log('ui contract tests passed');
