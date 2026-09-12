import {readFileSync} from 'node:fs';
import {promotionReport,validatePromotionManifest} from '../src/corridor-promotion-core.mjs';
const nodes=JSON.parse(readFileSync('data/nodes.json','utf8'));
const manifest=JSON.parse(readFileSync('data/source/corridor-promotion-manifest-2026-09-12.json','utf8'));
validatePromotionManifest(manifest,{nodes});
const report=promotionReport(manifest,{nodes});
console.log(`Promotion manifest: ${report.counts.total} patterns`);
console.log(`Ready: ${report.counts.ready}`);
console.log(`Needs node mapping: ${report.counts.needs_node_mapping}`);
console.log(`Staged: ${report.counts.staged}`);
if(report.unresolved.length){
  console.log('Unresolved anchors:');
  for(const item of report.unresolved)console.log(`- ${item.id}: ${item.missing.join(', ')}`);
}
