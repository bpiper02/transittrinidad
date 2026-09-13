import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildBlockedEndpointBatches,inferMissingEndpointName,cleanPTSCBlockedTitle} from '../src/ptsc-blocked-endpoint-core.mjs';

const report=JSON.parse(await readFile(new URL('../data/source/ptsc-promotion-2026-09-13.json',import.meta.url),'utf8'));
const summary=buildBlockedEndpointBatches(report);

assert.equal(summary.totalBlocked,report.blocked.length);
assert.equal(new Set(summary.batches.flatMap(batch=>batch.records.map(record=>record.officialId))).size,report.blocked.length);
assert.equal(cleanPTSCBlockedTitle('POS / City Service: Round D&#8217; Town'),'POS / City Service: Round D’ Town');

const findRecord=title=>report.blocked.find(record=>record.title===title);
assert.equal(inferMissingEndpointName(findRecord('POS/Piarco')),'Piarco');
assert.equal(inferMissingEndpointName(findRecord('Guapo / POS')),'Guapo');
assert.equal(inferMissingEndpointName(findRecord('Chaguanas / Cashew Gardens / Carlsen Field')),'Carlsen Field');
assert.equal(inferMissingEndpointName(findRecord('Saturday Arima Transit')),null);

const batchIds=new Map(summary.batches.flatMap(batch=>batch.records.map(record=>[record.title,batch.id])));
assert.equal(batchIds.get('POS/Piarco'),'east-corridor');
assert.equal(batchIds.get('Scarborough/Mason Hall'),'tobago');
assert.equal(batchIds.get('Point Fortin / Icacos'),'south-west');
assert.equal(batchIds.get('Chaguanas / Edinburgh 500'),'central');
assert.equal(batchIds.get('POS / Petit Valley'),'pos-north-west');
assert.equal(batchIds.get('Saturday Arima Transit'),'manual-taxonomy-review');

const manual=summary.batches.find(batch=>batch.id==='manual-taxonomy-review');
assert.ok(manual.records.every(record=>record.needsManualTaxonomy));
assert.ok(summary.unresolvedEndpoints.some(endpoint=>endpoint.name==='Piarco'));

console.log(`PTSC blocked endpoint triage covered ${summary.totalBlocked} records across ${summary.batches.length} batches.`);
