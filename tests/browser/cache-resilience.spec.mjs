import {test,expect} from '@playwright/test';

const mapLibreStub=`
export class LngLatBounds {
  constructor(){this.points=[];}
  extend(point){this.points.push(point);return this;}
  isEmpty(){return this.points.length===0;}
}
export class NavigationControl { constructor(){} }
export class Map {
  constructor(){this.handlers=new globalThis.Map();this.sources=new globalThis.Map();this.canvas={style:{}};queueMicrotask(()=>this.handlers.get('load')?.forEach(fn=>fn()));}
  addControl(){}
  addSource(id,source){this.sources.set(id,{...source,setData(data){this.data=data;}});}
  addLayer(){}
  getSource(id){return this.sources.get(id);}
  getCanvas(){return this.canvas;}
  fitBounds(){}
  isStyleLoaded(){return true;}
  on(event,layerOrHandler,maybeHandler){const handler=typeof layerOrHandler==='function'?layerOrHandler:maybeHandler;if(!this.handlers.has(event))this.handlers.set(event,[]);this.handlers.get(event).push(handler);}
}
`;

async function primeNetwork(page){
  await page.route('https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:mapLibreStub}));
  await page.route('https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.css',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://photon.komoot.io/api**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({features:[]})}));
  await page.route('https://router.project-osrm.org/route/v1/driving/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({routes:[{duration:900,distance:12000,geometry:{coordinates:[[-61.47,10.42],[-61.41,10.51]]}}]})}));
  await page.route('https://tile.openstreetmap.org/**',route=>route.fulfill({status:204,body:''}));
}

test('valid JSON with invalid cache shape falls back instead of crashing the planner',async({page})=>{
  await primeNetwork(page);
  await page.addInitScript(()=>{
    globalThis.localStorage.setItem('transittrinidad-geocode-v2','null');
    globalThis.localStorage.setItem('transittrinidad-road-geometry-v1','[]');
  });
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#serviceCount')).not.toHaveText('0');
  await page.locator('#fromInput').fill('California');
  await page.locator('#toInput').fill('Claxton Bay');
  await page.locator('#planButton').click();

  await expect(page.locator('#detailPanel')).toBeVisible();
  await expect(page.locator('#plannerStatus')).not.toContainText(/Finding routes|Loading route/);
  expect(pageErrors).toEqual([]);
});
