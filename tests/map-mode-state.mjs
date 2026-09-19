import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app=await readFile(new URL('../public/app-v2.js',import.meta.url),'utf8');
assert.match(app,/function restoreMapOverlays\(\)/);
assert.match(app,/currentRoutePlan\.options\[currentRoutePlan\.selectedIndex\]/,'selected alternative must be restored after style change');
assert.match(app,/showJourneyMap\(currentRoutePlan\.from,currentRoutePlan\.to,option\)/,'journey markers and overlays must be restored');
assert.match(app,/renderDetail\(services\.find/,'selected service detail survives without a journey');
assert.match(app,/map\.setStyle\(MAP_STYLES\[style\]\)/);
assert.match(app,/map\.once\('style.load',restoreMapOverlays\)/);
console.log('map-mode state preservation contract passed');
