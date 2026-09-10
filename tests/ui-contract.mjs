import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

for (const id of ['map','serviceList','serviceCount','modeTabs','detailPanel','fromInput','toInput']) {
  assert.match(html,new RegExp(`id=["']${id}["']`),`missing #${id}`);
}
assert.match(html,/PLAN TRIP · SOON/);
assert.match(html,/Solid endpoints ≠ exact route path/);
assert.match(app,/geometryConfidence === 'endpoints_only'/);
assert.match(app,/No verified services in this mode yet/);
assert.match(app,/OpenStreetMap contributors/);

console.log('ui contract tests passed');
