import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [app,css,scheduleCss,rootNodes,rootServices,rootTransfers,rootSchedules,rootPlaces,publicNodes,publicServices,publicTransfers,publicSchedules,publicPlaces,rootRouting,publicRouting,rootScheduleCore,publicScheduleCore,rootPlaceCore,publicPlaceCore]=await Promise.all([
  readFile(new URL('../public/app-v2.js',import.meta.url),'utf8'),
  readFile(new URL('../public/styles.css',import.meta.url),'utf8'),
  readFile(new URL('../public/schedule.css',import.meta.url),'utf8'),
  readFile(new URL('../data/nodes.json',import.meta.url),'utf8'),
  readFile(new URL('../data/services.json',import.meta.url),'utf8'),
  readFile(new URL('../data/transfers.json',import.meta.url),'utf8'),
  readFile(new URL('../data/schedules.json',import.meta.url),'utf8'),
  readFile(new URL('../data/places.json',import.meta.url),'utf8'),
  readFile(new URL('../public/data/nodes.json',import.meta.url),'utf8'),
  readFile(new URL('../public/data/services.json',import.meta.url),'utf8'),
  readFile(new URL('../public/data/transfers.json',import.meta.url),'utf8'),
  readFile(new URL('../public/data/schedules.json',import.meta.url),'utf8'),
  readFile(new URL('../public/data/places.json',import.meta.url),'utf8'),
  readFile(new URL('../src/routing-core.mjs',import.meta.url),'utf8'),
  readFile(new URL('../public/src/routing-core.mjs',import.meta.url),'utf8'),
  readFile(new URL('../src/schedule-core.mjs',import.meta.url),'utf8'),
  readFile(new URL('../public/src/schedule-core.mjs',import.meta.url),'utf8'),
  readFile(new URL('../src/place-core.mjs',import.meta.url),'utf8'),
  readFile(new URL('../public/src/place-core.mjs',import.meta.url),'utf8')
]);

assert.match(app,/getJson\('\.\/data\/nodes\.json'\)/);
assert.match(app,/getJson\('\.\/data\/services\.json'\)/);
assert.match(app,/getJson\('\.\/data\/transfers\.json'\)/);
assert.match(app,/getJson\('\.\/data\/schedules\.json'\)/);
assert.match(app,/getJson\('\.\/data\/places\.json'\)/);
assert.doesNotMatch(app,/\bOn time\b/,'static timetable data cannot claim on-time status');
assert.match(scheduleCss,/\.schedule-block/);
assert.match(app,/maplibregl\.Map/);
assert.doesNotMatch(app,/\bL\.map\b|invalidateSize|ResizeObserver/);
assert.match(app,/journey-transit/);
assert.match(app,/journey-transfer/);
assert.match(app,/chooseJourneyOptions/);
assert.match(app,/data-route-option/);
assert.match(app,/autocompletePlaces/);
assert.match(app,/showNoRouteMap/);
assert.match(app,/exactPlace/,'town searches should be independent from network nodes');
assert.match(app,/explicitNetworkNode/,'explicit terminal searches should still bind exactly');
assert.match(css,/html,body\{[^}]*height:100%[^}]*overflow:hidden/);
assert.match(css,/\.app-shell\{position:fixed;inset:0;overflow:hidden\}/);
assert.match(css,/\.map\{[^}]*position:absolute[^}]*left:390px/);
assert.match(css,/@media\(max-width:760px\)/);
assert.match(css,/@media\(max-width:760px\)\{[^}]*\.directions-shell\{[^}]*overflow:visible/,'mobile result sheet must not be clipped by the directions shell');
assert.match(css,/\.suggestions button:hover,\.suggestions button\.is-keyboard-active/);
assert.match(css,/\.network-notice/,'trust notice must be styled as a single compact disclosure');
assert.deepEqual(JSON.parse(publicNodes),JSON.parse(rootNodes),'public nodes must match canonical data');
assert.deepEqual(JSON.parse(publicServices),JSON.parse(rootServices),'public services must match canonical data');
assert.deepEqual(JSON.parse(publicTransfers),JSON.parse(rootTransfers),'public transfers must match canonical data');
assert.deepEqual(JSON.parse(publicSchedules),JSON.parse(rootSchedules),'public schedules must match canonical data');
assert.deepEqual(JSON.parse(publicPlaces),JSON.parse(rootPlaces),'public places must match canonical data');
assert.equal(publicRouting,rootRouting,'browser routing core must match canonical routing core');
assert.equal(publicScheduleCore,rootScheduleCore,'browser schedule core must match canonical schedule core');
assert.equal(publicPlaceCore,rootPlaceCore,'browser place core must match canonical place core');

console.log('atlas UI contract tests passed');
