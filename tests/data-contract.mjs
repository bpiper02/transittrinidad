import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateDataset, validateService, validateSource } from '../src/data-contract.mjs';

const nodes = JSON.parse(await readFile(new URL('../data/nodes.json', import.meta.url)));
const services = JSON.parse(await readFile(new URL('../data/services.json', import.meta.url)));

assert.equal(validateDataset({nodes,services}), true);

assert.throws(() => validateService({
  id:'bad',
  mode:'maxi',
  originNodeId:'a',
  destinationNodeId:'a',
  bidirectional:true,
  serviceConfidence:'verified_service',
  geometryConfidence:'unknown',
  fareConfidence:'unknown',
  scheduleConfidence:'unknown',
  sources:[{name:'x',url:'https://example.com',checkedAt:'2026-09-10'}]
}), /same origin and destination/);

assert.throws(() => validateService({
  id:'fake-geometry',
  mode:'ptsc',
  originNodeId:'a',
  destinationNodeId:'b',
  bidirectional:true,
  serviceConfidence:'verified_service',
  geometryConfidence:'verified_path',
  geometry:null,
  fareConfidence:'unknown',
  scheduleConfidence:'unknown',
  sources:[{name:'x',url:'https://example.com',checkedAt:'2026-09-10'}]
}), /must include geometry/);

assert.throws(() => validateService({
  id:'missing-direction',
  mode:'ptsc',
  originNodeId:'a',
  destinationNodeId:'b',
  serviceConfidence:'verified_service',
  geometryConfidence:'unknown',
  fareConfidence:'unknown',
  scheduleConfidence:'unknown',
  sources:[{name:'x',url:'https://example.com',checkedAt:'2026-09-10'}]
}), /must explicitly declare bidirectional/);

assert.throws(() => validateService({
  id:'bad-direction',
  mode:'ptsc',
  originNodeId:'a',
  destinationNodeId:'b',
  bidirectional:'yes',
  serviceConfidence:'verified_service',
  geometryConfidence:'endpoints_only',
  fareConfidence:'unknown',
  scheduleConfidence:'unknown',
  sources:[{name:'x',url:'https://example.com',checkedAt:'2026-09-10'}]
}), /bidirectional/);

assert.throws(() => validateSource({name:'x',url:'https://example.com',checkedAt:'2026-02-31'}), /real YYYY-MM-DD date/);

console.log(`data contract tests passed: ${nodes.length} nodes, ${services.length} services`);
