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

async function primeMap(page){
  await page.route('https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:mapLibreStub}));
  await page.route('https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.css',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://tile.openstreetmap.org/**',route=>route.fulfill({status:204,body:''}));
}

test('external autocomplete labels render as text instead of executable markup',async({page})=>{
  await primeMap(page);
  const payload='<img data-xss="photon" src=x onerror="window.__photonXss=1">';
  await page.route('https://photon.komoot.io/api**',route=>route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({features:[{geometry:{coordinates:[-61.45,10.52]},properties:{name:payload}}]})
  }));

  await page.goto('/');
  await page.locator('#fromInput').fill('zzzz-hostile-place');
  await expect(page.locator('#fromSuggestions')).toBeVisible();
  await expect(page.locator('#fromSuggestions')).toContainText('<img');
  await expect(page.locator('#fromSuggestions [data-xss="photon"]')).toHaveCount(0);
  expect(await page.evaluate(()=>globalThis.__photonXss)).toBeUndefined();
});

test('service evidence escapes labels and rejects non-http URLs',async({page})=>{
  await primeMap(page);
  await page.route('**/data/services.json',async route=>{
    const response=await route.fetch();
    const data=await response.json();
    for(const service of data){
      service.sources=[
        {name:'<img data-xss="source" src=x onerror="window.__sourceXss=1">',url:'https://example.com/?q=\"><img src=x>'},
        {name:'Unsafe protocol',url:'javascript:window.__sourceXss=2'}
      ];
    }
    await route.fulfill({response,json:data});
  });
  await page.route('https://router.project-osrm.org/route/v1/driving/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));

  await page.goto('/');
  await page.locator('#trayToggle').click();
  await expect(page.locator('.service-card').first()).toBeVisible();
  await page.locator('.service-card').first().click();
  await expect(page.locator('#detailPanel')).toBeVisible();
  await expect(page.locator('#detailPanel')).toContainText('<img');
  await expect(page.locator('#detailPanel [data-xss="source"]')).toHaveCount(0);
  await expect(page.locator('#detailPanel a[href^="javascript:"]')).toHaveCount(0);
  expect(await page.evaluate(()=>globalThis.__sourceXss)).toBeUndefined();
});

test('pilot JSON values cannot create DOM elements when rendered',async({page})=>{
  await page.route('**/data/pilot-central-south-c1.json',async route=>{
    const response=await route.fetch();
    const data=await response.json();
    const payload='<img data-xss="pilot" src=x onerror="window.__pilotXss=1">';
    data.fareBaseline.shortDropTTD=payload;
    data.fareBaseline.southboundFromChaguanas.at(-1).fareTTD=payload;
    data.journeys[0].expectedTransfersMax=payload;
    await route.fulfill({response,json:data});
  });

  await page.goto('/pilot-central-south.html');
  await expect(page.locator('.journey').first()).toBeVisible();
  await expect(page.locator('[data-xss="pilot"]')).toHaveCount(0);
  expect(await page.evaluate(()=>globalThis.__pilotXss)).toBeUndefined();
});
