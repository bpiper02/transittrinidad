import assert from 'node:assert/strict';
import {accuracyBand,geolocationSupported,locationPlaceFromPosition,requestCurrentPosition} from '../src/location-core.mjs';

assert.deepEqual(accuracyBand(null),{level:'unknown',label:'Location accuracy unknown',usable:false});
assert.equal(accuracyBand(30).level,'good');
assert.equal(accuracyBand(120).level,'ok');
assert.equal(accuracyBand(220).level,'low');
assert.equal(accuracyBand(220).usable,true);
assert.ok(accuracyBand(220).warning.includes('nearby stands'));

assert.equal(geolocationSupported({}),false);
assert.equal(geolocationSupported({geolocation:{getCurrentPosition(){}}}),true);

const place=locationPlaceFromPosition({coords:{latitude:10.6501,longitude:-61.5012,accuracy:42}});
assert.equal(place.id,'current-location');
assert.equal(place.name,'Current location');
assert.equal(place.lat,10.6501);
assert.equal(place.lng,-61.5012);
assert.deepEqual(place.location,{lat:10.6501,lng:-61.5012});
assert.equal(place.routingRadiusKm,5);
assert.equal(place.source,'browser_geolocation');
assert.equal(place.accuracyBand,'good');

const broad=locationPlaceFromPosition({coords:{latitude:10.6501,longitude:-61.5012,accuracy:300}});
assert.equal(broad.routingRadiusKm,8);
assert.equal(broad.accuracyBand,'low');
assert.ok(broad.accuracyWarning);

await assert.rejects(()=>requestCurrentPosition({navigatorLike:{}}),/not supported/);

const fakeNavigator={
  geolocation:{
    getCurrentPosition(success){
      success({coords:{latitude:10.1,longitude:-61.2,accuracy:80}});
    }
  }
};
const requested=await requestCurrentPosition({navigatorLike:fakeNavigator});
assert.equal(requested.lat,10.1);
assert.equal(requested.accuracyBand,'ok');

console.log('location core tests passed');
