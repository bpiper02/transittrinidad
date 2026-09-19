import assert from 'node:assert/strict';
import {privacyLightEvent} from '../src/privacy-analytics-core.mjs';
assert.deepEqual(privacyLightEvent('planner_completed',{outcome:'found',mode:'all',transferBand:'1',query:'Port of Spain',lat:'10.6',lng:'-61.5'}),{event:'planner_completed',properties:{outcome:'found',mode:'all',transferBand:'1'}});
assert.throws(()=>privacyLightEvent('location_saved',{}),/unsupported/);
console.log('privacy analytics tests passed');
