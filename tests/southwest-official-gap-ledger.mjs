import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const [ledger,nodes,services,places]=await Promise.all([
  readJson('../data/source/southwest-official-edge-gaps-2026-09-14.json'),
  readJson('../data/nodes.json'),
  readJson('../data/services.json'),
  readJson('../data/places.json')
]);

const nodeIds=new Set(nodes.map(node=>node.id));
const placeNames=new Set(places.map(place=>place.name));
const serviceIds=new Set(services.map(service=>service.id));

function serviceStopsInclude(stopId){
  return services.some(service=>(service.stopNodeIds||[]).includes(stopId));
}

function directServiceExists({from,to,mode}){
  return services.some(service=>{
    if(mode&&service.mode!==mode)return false;
    const stops=service.stopNodeIds||[];
    const fromIndex=stops.indexOf(from);
    const toIndex=stops.indexOf(to);
    return fromIndex>=0&&toIndex>fromIndex;
  });
}

assert.equal(ledger.region,'southwest-trinidad');
assert.ok(Array.isArray(ledger.gaps)&&ledger.gaps.length>=4,'expected southwest gap ledger entries');

const byId=new Map(ledger.gaps.map(gap=>[gap.id,gap]));
for(const required of ['ptsc-san-fernando-icacos','ptsc-siparia-pos-via-penal','palo-seco-local-service','santa-flora-local-service']){
  assert.ok(byId.has(required),`missing ledger entry ${required}`);
}

const icacos=byId.get('ptsc-san-fernando-icacos');
assert.equal(icacos.status,'promoted_directional_service');
assert.ok(nodeIds.has(icacos.fromNodeId),'San Fernando endpoint must stay anchored to the official PTSC terminal');
assert.ok(nodeIds.has(icacos.endpointNodeId),'Promoted Icacos endpoint must have a deliberate public map/gazetteer-backed node');
assert.ok(serviceIds.has(icacos.promotedServiceId),'Promoted Icacos service must exist in services.json');
assert.equal(directServiceExists({from:icacos.fromNodeId,to:icacos.endpointNodeId,mode:'ptsc'}),true,'San Fernando → Icacos PTSC should be routable after endpoint promotion');
assert.equal(directServiceExists({from:icacos.endpointNodeId,to:icacos.fromNodeId,mode:'ptsc'}),false,'Icacos → San Fernando PTSC must not be invented as a reverse direction');

const sipariaPos=byId.get('ptsc-siparia-pos-via-penal');
assert.equal(sipariaPos.status,'source_found_pending_service_shape');
assert.ok(nodeIds.has(sipariaPos.toNodeId),'POS endpoint must stay anchored to the official PTSC terminal');
assert.ok(sipariaPos.fromCandidateNodeIds.some(id=>nodeIds.has(id)),'ledger needs at least one candidate Siparia node');
assert.ok(sipariaPos.viaCandidateNodeIds.some(id=>nodeIds.has(id)),'ledger needs at least one candidate Penal node');
for(const from of sipariaPos.fromCandidateNodeIds.filter(id=>nodeIds.has(id))){
  assert.equal(directServiceExists({from,to:sipariaPos.toNodeId,mode:'ptsc'}),false,'Siparia → POS via Penal must not be promoted before a deliberate service-shape decision');
}

for(const id of ['palo-seco-local-service','santa-flora-local-service']){
  const gap=byId.get(id);
  assert.equal(gap.status,'insufficient_route_evidence');
  assert.ok(placeNames.has(gap.knownPlace),`${gap.knownPlace} should remain searchable as a place`);
  const normalized=gap.knownPlace.toLowerCase().replaceAll(' ','-');
  assert.equal(serviceIds.has(normalized),false,`${gap.knownPlace} must not be represented by a fake service id`);
  assert.equal(serviceStopsInclude(normalized),false,`${gap.knownPlace} must not be used as a fake route node`);
}

console.log(`Southwest official gap ledger passed: ${ledger.gaps.length} entries`);
