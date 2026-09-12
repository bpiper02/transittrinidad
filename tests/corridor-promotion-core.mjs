import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {promotionReport,validatePromotionManifest} from '../src/corridor-promotion-core.mjs';

const nodes=JSON.parse(readFileSync(new URL('../data/nodes.json',import.meta.url),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('../data/source/corridor-promotion-manifest-2026-09-12.json',import.meta.url),'utf8'));
validatePromotionManifest(manifest,{nodes});
const report=promotionReport(manifest,{nodes});
assert.equal(report.counts.total,manifest.length);
assert.ok(report.counts.ready>0);
assert.ok(report.counts.needs_node_mapping>0);
assert.ok(report.counts.staged>0);
for(const pattern of manifest.filter(item=>item.status==='ready')){
  assert.equal(pattern.anchors.some(anchor=>!anchor.nodeId),false,`ready pattern ${pattern.id} must have no unmapped anchors`);
  assert.equal(report.unresolved.some(item=>item.id===pattern.id),false,`ready pattern ${pattern.id} must not appear unresolved`);
}

assert.throws(()=>validatePromotionManifest([{id:'bad',region:'x',mode:'maxi',patternType:'local',boardingPolicy:'corridor_hail',alightingPolicy:'corridor_request',status:'ready',anchors:[{name:'A',nodeId:'chag-maxi-area'},{name:'B',nodeId:null}]}],{nodes}),/unmapped anchors/);

console.log(`corridor promotion tests passed: ${report.counts.ready} ready, ${report.counts.needs_node_mapping} need mapping, ${report.counts.staged} staged`);
