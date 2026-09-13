import {readFile} from 'node:fs/promises';
import {buildBlockedEndpointBatches} from '../src/ptsc-blocked-endpoint-core.mjs';

const [reportPath='data/source/ptsc-promotion-2026-09-13.json']=process.argv.slice(2);
const report=JSON.parse(await readFile(reportPath,'utf8'));
const summary=buildBlockedEndpointBatches(report);

for(const batch of summary.batches){
  console.log(`\n${batch.label} (${batch.count})`);
  for(const record of batch.records){
    const endpoint=record.missingEndpointName?` · missing: ${record.missingEndpointName}`:'';
    const fare=record.needsFare?' · needs fare':'';
    console.log(`- ${record.officialId}: ${record.title}${endpoint}${fare}`);
  }
}

console.log(`\nTotal blocked: ${summary.totalBlocked}`);
console.log('Top unresolved endpoint labels:');
for(const endpoint of summary.unresolvedEndpoints.slice(0,12))console.log(`- ${endpoint.name}: ${endpoint.count}`);
