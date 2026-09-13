export function accuracyBand(accuracyMeters){
  if(!Number.isFinite(accuracyMeters)||accuracyMeters<=0)return{level:'unknown',label:'Location accuracy unknown',usable:false};
  if(accuracyMeters<=50)return{level:'good',label:`Accurate to about ${Math.round(accuracyMeters)} m`,usable:true};
  if(accuracyMeters<=150)return{level:'ok',label:`Approximate within ${Math.round(accuracyMeters)} m`,usable:true};
  return{level:'low',label:`Low accuracy: about ${Math.round(accuracyMeters)} m`,usable:true,warning:'Location is broad, so nearby stands and main roads may be approximate.'};
}

export function geolocationSupported(navigatorLike=globalThis.navigator){
  return Boolean(navigatorLike?.geolocation?.getCurrentPosition);
}

export function locationPlaceFromPosition(position,{label='Current location'}={}){
  const coords=position?.coords;
  if(!coords||!Number.isFinite(coords.latitude)||!Number.isFinite(coords.longitude)){
    throw new Error('Location unavailable: missing coordinates.');
  }
  const accuracy=Number.isFinite(coords.accuracy)?coords.accuracy:null;
  const band=accuracyBand(accuracy);
  return{
    id:'current-location',
    label,
    name:label,
    lat:coords.latitude,
    lng:coords.longitude,
    location:{lat:coords.latitude,lng:coords.longitude},
    routingRadiusKm:band.level==='low'?8:5,
    source:'browser_geolocation',
    accuracyMeters:accuracy,
    accuracyBand:band.level,
    accuracyLabel:band.label,
    accuracyWarning:band.warning||null
  };
}

export function requestCurrentPosition({navigatorLike=globalThis.navigator,timeout=10000,maximumAge=30000,enableHighAccuracy=true}={}){
  if(!geolocationSupported(navigatorLike))return Promise.reject(new Error('Geolocation is not supported by this browser.'));
  return new Promise((resolve,reject)=>{
    navigatorLike.geolocation.getCurrentPosition(
      position=>resolve(locationPlaceFromPosition(position)),
      error=>reject(error),
      {enableHighAccuracy,timeout,maximumAge}
    );
  });
}
