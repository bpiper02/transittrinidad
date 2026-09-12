import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {exactPlace,explicitNetworkNode,matchPlaces,mergePlaceSuggestions,placeToPoint} from '../src/place-core.mjs';

const places=JSON.parse(await readFile(new URL('../data/places.json',import.meta.url)));
const publicPlaces=JSON.parse(await readFile(new URL('../public/data/places.json',import.meta.url)));
const nodesArray=JSON.parse(await readFile(new URL('../data/nodes.json',import.meta.url)));
const nodes=new Map(nodesArray.map(node=>[node.id,node]));

assert.deepEqual(publicPlaces,places,'public places must mirror canonical places');
assert.ok(places.length>=20,'place layer should include a useful local alias base');
assert.equal(new Set(places.map(place=>place.id)).size,places.length,'place ids must be unique');
for(const place of places){
  assert.ok(place.name&&place.kind,'places need names and semantic kinds');
  assert.ok(Number.isFinite(place.location?.lat)&&Number.isFinite(place.location?.lng),'places need centroid coordinates');
  assert.ok(Number.isFinite(place.routingRadiusKm)&&place.routingRadiusKm>0,'places need a bounded network search radius');
  assert.ok(place.source?.name&&place.source?.checkedAt,'local place centroids need provenance');
}

assert.equal(exactPlace('Couva',places)?.id,'place-couva');
assert.equal(exactPlace('couva trinidad',places)?.id,'place-couva','aliases should resolve to the same place entity');
assert.equal(exactPlace('Princes Town',places)?.id,'place-princes-town');
assert.equal(matchPlaces('crown',places)[0]?.id,'place-crown-point');
assert.deepEqual(placeToPoint(exactPlace('Chaguanas',places)),{name:'Chaguanas',lat:10.5147394,lng:-61.4076757,placeId:'place-chaguanas',routingRadiusKm:5});

const fakeNodes=new Map([
  ['town-node',{id:'town-node',name:'Couva',kind:'terminal',location:{lat:10.42,lng:-61.46}}],
  ['explicit-terminal',{id:'explicit-terminal',name:'Couva Transit Terminal',kind:'terminal',location:{lat:10.421,lng:-61.461}}],
  ['area',{id:'area',name:'Some Area',kind:'stop_zone',location:{lat:10.4,lng:-61.4}}]
]);
assert.equal(explicitNetworkNode('Couva',fakeNodes,places),null,'a town query must resolve as a place, not an arbitrary same-name terminal');
assert.equal(explicitNetworkNode('Couva Transit Terminal',fakeNodes,places)?.id,'explicit-terminal','an explicit terminal query may bind to that terminal');
assert.equal(explicitNetworkNode('Some Area',fakeNodes,places),null,'approximate stop zones must not become exact place bindings');

const merged=mergePlaceSuggestions([exactPlace('Couva',places)],[{name:'Couva, Couva-Tabaquite-Talparo, Trinidad and Tobago',lat:10.4223,lng:-61.4587}],{limit:6});
assert.equal(merged[0].placeId,'place-couva','local place entities should rank before remote geocoder matches');

assert.ok(nodes.size>0);
console.log(`place core tests passed: ${places.length} canonical places`);
