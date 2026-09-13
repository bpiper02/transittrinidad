import assert from 'node:assert/strict';
import {parseNominatimPlace,parseOsrmRoute,parsePhotonFeatures} from '../src/external-data-core.mjs';

assert.deepEqual(parsePhotonFeatures(null),[]);
assert.deepEqual(parsePhotonFeatures({features:{}}),[]);
assert.deepEqual(parsePhotonFeatures({features:[null,{geometry:{coordinates:['bad',10.5]}},{geometry:{coordinates:[-61.5,'10.6']},properties:{name:'Valid'}}]}),[
  {properties:{name:'Valid'},lng:-61.5,lat:10.6}
]);

assert.equal(parseNominatimPlace(null),null);
assert.equal(parseNominatimPlace({length:1,0:{display_name:'Fake',lat:'10',lon:'-61'}}),null);
assert.equal(parseNominatimPlace([{display_name:'',lat:'10',lon:'-61'}]),null);
assert.deepEqual(parseNominatimPlace([{display_name:' Port of Spain ',lat:'10.66',lon:'-61.51'}]),{name:'Port of Spain',lat:10.66,lng:-61.51});

assert.equal(parseOsrmRoute(null),null);
assert.equal(parseOsrmRoute({routes:{}}),null);
assert.equal(parseOsrmRoute({routes:[{geometry:{coordinates:'not-an-array'}}]}),null);
assert.equal(parseOsrmRoute({routes:[{geometry:{coordinates:[[-61.5,10.5],['bad',10.6]]}}]}),null);
assert.deepEqual(parseOsrmRoute({routes:[{duration:'900',distance:12000,geometry:{coordinates:[['-61.5','10.5'],[-61.4,10.6]]}}]}),{
  coordinates:[[-61.5,10.5],[-61.4,10.6]],
  durationSeconds:900,
  distanceMeters:12000
});
assert.deepEqual(parseOsrmRoute({routes:[{duration:-1,distance:'bad',geometry:{coordinates:[[-61.5,10.5],[-61.4,10.6]]}}]}),{
  coordinates:[[-61.5,10.5],[-61.4,10.6]],
  durationSeconds:null,
  distanceMeters:null
});

console.log('external data parser tests passed');
