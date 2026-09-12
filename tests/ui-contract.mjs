import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app-v2.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');

for(const id of ['appShell','map','serviceList','serviceCount','modeTabs','detailPanel','fromInput','toInput','planButton','swapButton','plannerStatus','fromSuggestions','toSuggestions'])assert.match(html,new RegExp(`id=["']${id}["']`),`missing #${id}`);
assert.match(html,/maplibre-gl@6\.8\.0/);
assert.match(html,/app-v2\.js/,'the place-aware planner must be the active browser entry point');
assert.match(html,/class="network-notice"/,'network limitations should be consolidated into one notice');
assert.equal((html.match(/About this map/g)||[]).length,1,'there should be one network notice, not repeated warnings');
assert.doesNotMatch(html,/datalist|placeOptions/,'native datalist must not constrain arbitrary-place search');

assert.match(app,/new maplibregl\.Map/);
assert.match(app,/\.\/src\/routing-core\.mjs/);
assert.match(app,/\.\/src\/place-core\.mjs/,'browser must use the canonical place-resolution vocabulary');
assert.match(app,/getJson\('\.\/data\/places\.json'\)/,'browser must load local place aliases and centroids');
assert.match(app,/exactPlace\(/,'plain town names should resolve through the place layer');
assert.match(app,/explicitNetworkNode\(/,'explicit stand and terminal searches should remain possible');
assert.match(app,/matchPlaces\(/,'local place aliases should participate in autocomplete');
assert.match(app,/mergePlaceSuggestions\(/,'local and external place search should merge rather than compete');
assert.match(app,/nominatim\.openstreetmap\.org\/search/);
assert.match(app,/countrycodes:'tt'/);
assert.match(app,/photon\.komoot\.io\/api/);
assert.match(app,/bbox:'-61\.98,9\.95,-60\.42,11\.42'/);

assert.match(app,/routingServices\(\)/);
assert.match(app,/requiredMode:activeMode==='all'\?null:activeMode/,'mode tabs must require the chosen mode while retaining connector modes');
assert.match(app,/corridorGroups/);
assert.match(app,/backgroundServices/);
assert.match(app,/corridorIsBidirectional/);
assert.match(app,/getJson\('\.\/data\/transfers\.json'\)/);
assert.match(app,/chooseJourneyOptions/);
assert.match(app,/candidateLimit:12/);
assert.match(app,/maxOptions:3/);
assert.match(app,/if\(options\.length>1\)/);
assert.match(app,/data-route-option/);
assert.match(app,/compactJourneySteps/);
assert.match(app,/step\.kind==='transfer'/);
assert.match(app,/journey-transfer/);
assert.match(app,/planCurrentTrip\(\{reuseContext:true\}\)/,'mode changes must re-plan the same resolved trip');
assert.match(app,/currentTripContext=\{fromEndpoint,toEndpoint,from,to,knownFrom,knownTo\}/,'resolved place context must survive mode changes');

assert.match(app,/Take the \$\{maxiBandLabel\(step\.service\)\} toward/,'Maxi directions should name the route band and direction');
assert.match(app,/Board at \$\{origin\?\.name\|\|step\.from\}/,'journey instructions should name the boarding point');
assert.match(app,/Fare unknown/,'unknown fares should be compact metadata rather than invented values');
assert.match(app,/Reported route/,'reported service confidence should remain visible as metadata');
assert.match(app,/Journey data/,'journey evidence should be available in one expandable section');
assert.doesNotMatch(app,/current operation unconfirmed|Confirm service and boarding|access method unconfirmed|Sailing times are not yet included/,'route cards should not repeat defensive notices already covered globally');
assert.doesNotMatch(app,/\bOn time\b/,'static schedules cannot claim real-time punctuality');

assert.match(app,/fetchWithTimeout/);
assert.match(app,/plannerRequestId/);
assert.match(app,/autocompleteControllers\.get\(inputId\)\?\.abort\(\)/);
assert.match(app,/event\.key==='ArrowDown'/);
assert.match(app,/router\.project-osrm\.org\/route\/v1\/driving/);
assert.match(app,/OSRM_CACHE_KEY/);
assert.match(app,/MAXI_BAND_COLORS/);
assert.match(app,/\['get','routeColor'\]/);
assert.match(app,/line-join':'round'/);

assert.match(css,/html,body\{[^}]*height:100%[^}]*overflow:hidden/);
assert.match(css,/\.directions-shell\{[^}]*width:390px/);
assert.match(css,/\.map\{[^}]*left:390px/);
assert.match(css,/-apple-system/);
assert.match(css,/\.network-notice\{/);
assert.match(css,/\.data-chip\{/);
assert.match(css,/\.data-details\{/);
assert.match(css,/\.suggestions\{/);
assert.match(css,/\.mode-tabs\{[^}]*scrollbar-width:none/);
assert.match(css,/\.route-options\{/);
assert.match(css,/\.route-option\.is-active/);

console.log('ui contract tests passed');
