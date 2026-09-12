import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const services=JSON.parse(await readFile(new URL('../data/services.json',import.meta.url)));
const pointFortinServices=services.filter(service=>/point-fortin/.test(service.id)&&['maxi','route_taxi'].includes(service.mode));
assert.ok(pointFortinServices.length>0,'Point Fortin road services should exist');
for(const service of pointFortinServices){
  assert.equal(service.stopNodeIds.includes('la-brea-area'),false,`${service.id} must not inherit La Brea without pattern-specific evidence`);
  assert.equal(service.stopNodeIds.some(id=>/guapo/.test(id)),false,`${service.id} must not inherit Guapo without pattern-specific evidence`);
}
const laBreaServices=services.filter(service=>service.stopNodeIds?.includes('la-brea-area'));
assert.ok(laBreaServices.length>0,'La Brea should remain represented by its own service family');
for(const service of laBreaServices){
  assert.equal(service.destinationNodeId==='point-fortin-maxi-area'||service.originNodeId==='point-fortin-maxi-area',false,'La Brea dedicated services must not be silently converted into Point Fortin through-services');
}
console.log('Southwest service-separation tests passed');
