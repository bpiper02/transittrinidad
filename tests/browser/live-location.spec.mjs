import {test,expect} from '@playwright/test';

const mapLibreStub=`
export class LngLatBounds {
  constructor(){this.points=[];}
  extend(point){this.points.push(point);return this;}
}
export class NavigationControl { constructor(){} }
export class Map {
  constructor(){this.handlers=new globalThis.Map();this.sources=new globalThis.Map();this.canvas={style:{}};globalThis.__testMap=this;queueMicrotask(()=>this.handlers.get('load')?.forEach(fn=>fn()));}
  addControl(){}
  addSource(id,source){this.sources.set(id,{...source,data:source.data,setData(data){this.data=data;}});}
  addLayer(){}
  getSource(id){return this.sources.get(id);}
  getCanvas(){return this.canvas;}
  fitBounds(){}
  setLayoutProperty(){}
  isStyleLoaded(){return true;}
  on(event,layerOrHandler,maybeHandler){const handler=typeof layerOrHandler==='function'?layerOrHandler:maybeHandler;if(!this.handlers.has(event))this.handlers.set(event,[]);this.handlers.get(event).push(handler);}
}
`;

async function primeNetwork(page){
  await page.route('https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:mapLibreStub}));
  await page.route('https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.css',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://photon.komoot.io/api**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({features:[]})}));
  await page.route('https://router.project-osrm.org/route/v1/driving/**',route=>{
    const url=new URL(route.request().url());
    const coordinatePair=url.pathname.split('/').at(-1).split(';');
    const coordinates=coordinatePair.map(value=>value.split(',').map(Number));
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({routes:[{duration:900,distance:12000,geometry:{coordinates}}]})});
  });
  await page.route('https://tile.openstreetmap.org/**',route=>route.fulfill({status:204,body:''}));
}

async function currentPointKinds(page){
  return page.evaluate(()=>globalThis.__testMap?.getSource('search-points')?.data?.features?.map(feature=>feature.properties?.kind)||[]);
}

test.beforeEach(async({page})=>{await primeNetwork(page);});

test('uses current location as a route origin',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(success){success({coords:{latitude:10.4225,longitude:-61.4675,accuracy:35}});}},configurable:true});
  });
  await page.goto('/');
  await expect(page.locator('#serviceCount')).not.toHaveText('0');

  await page.locator('#fromLocationButton').click();
  await expect(page.locator('#fromInput')).toHaveValue('Current location');
  await expect(page.locator('#locationStatus')).toContainText('Start set to current location');
  await expect(page.locator('#locationStatus')).toContainText('Accurate to about 35 m');
  expect(await currentPointKinds(page)).toContain('current-from');

  await page.locator('#toInput').fill('Chaguanas');
  await page.locator('#planButton').click();
  await expect(page.locator('#detailPanel')).toBeVisible();
  await expect(page.locator('#detailPanel h2')).toContainText('Current location');
  await expect(page.locator('#plannerStatus')).not.toContainText(/Finding routes|Loading route/);
  expect(await currentPointKinds(page)).toContain('current-from');
});

test('shows a clear error when location permission fails',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(_success,error){error(new Error('Location permission denied.'));}},configurable:true});
  });
  await page.goto('/');
  await expect(page.locator('#serviceCount')).not.toHaveText('0');
  await page.locator('#fromLocationButton').click();
  await expect(page.locator('#locationStatus')).toContainText('Location permission denied.');
  await expect(page.locator('#locationStatus')).toHaveClass(/is-error/);
});
