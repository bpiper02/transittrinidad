import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateDataset, validateService, validateSource, validateTransfer } from '../src/data-contract.mjs';

const nodes = JSON.parse(await readFile(new URL('../data/nodes.json', import.meta.url)));
const services = JSON.parse(await readFile(new URL('../data/services.json', import.meta.url)));
const transfers = JSON.parse(await readFile(new URL('../data/transfers.json', import.meta.url)));

assert.equal(validateDataset({nodes,services,transfers}), true);

const base={
  id:'test-pattern',corridorId:'test-corridor',mode:'ptsc',originNodeId:'a',destinationNodeId:'b',stopNodeIds:['a','b'],
  serviceConfidence:'verified_service',geometryConfidence:'unknown',fareConfidence:'unknown',scheduleConfidence:'unknown',
  sources:[{name:'x',url:'https://example.com',checkedAt:'2026-09-10'}]
};

assert.throws(()=>validateService({...base,destinationNodeId:'a',stopNodeIds:['a','a']}),/same origin and destination/);
assert.throws(()=>validateService({...base,corridorId:''}),/corridorId/);
assert.throws(()=>validateService({...base,bidirectional:true}),/bidirectional is not allowed/);
assert.throws(()=>validateService({...base,stopNodeIds:['b','a']}),/must start at origin and end at destination/);
assert.throws(()=>validateService({...base,geometryConfidence:'verified_path',geometry:null}),/must include geometry/);
assert.throws(() => validateSource({name:'x',url:'https://example.com',checkedAt:'2026-02-31'}), /real YYYY-MM-DD date/);

const transferBase={
  id:'walk-a-b',fromNodeId:'a',toNodeId:'b',mode:'walk',distanceKm:.4,estimatedMinutes:6,confidence:'estimated_walk',
  sources:[{name:'x',url:'https://example.com',checkedAt:'2026-09-11'}]
};
assert.equal(validateTransfer(transferBase),true);
assert.throws(()=>validateTransfer({...transferBase,toNodeId:'a'}),/cannot connect a node to itself/);
assert.throws(()=>validateTransfer({...transferBase,mode:'drive'}),/transfer mode/);
assert.throws(()=>validateTransfer({...transferBase,estimatedMinutes:0}),/estimatedMinutes/);

console.log(`data contract tests passed: ${nodes.length} nodes, ${new Set(services.map(service=>service.corridorId)).size} corridors, ${services.length} directed patterns, ${transfers.length} walking transfers`);
