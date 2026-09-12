import {test,expect} from '@playwright/test';

const mapLibreStub=`
export class LngLatBounds {
  constructor(){this.points=[];}
  extend(point){this.points.push(point);return this;}
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

async function chooseLocalPlace(page,inputId,name){
  const input=page.locator(`#${inputId}`);
  await input.fill(name);
  const menu=page.locator(`#${inputId==='fromInput'?'fromSuggestions':'toSuggestions'}`);
  await expect(menu).toBeVisible();
  await menu.getByRole('option').first().click();
  await expect(input).toHaveValue(new RegExp(name,'i'));
}

async function planCouvaToChaguanas(page){
  await chooseLocalPlace(page,'fromInput','Couva');
  await chooseLocalPlace(page,'toInput','Chaguanas');
  await page.locator('#planButton').click();
  await expect(page.locator('#detailPanel')).toBeVisible();
  await expect(page.locator('#detailPanel h2')).toContainText('Couva');
  await expect(page.locator('#detailPanel h2')).toContainText('Chaguanas');
  await expect(page.locator('#plannerStatus')).not.toContainText(/Finding routes|Loading route/);
}

test.beforeEach(async({page})=>{await primeNetwork(page);await page.goto('/');await expect(page.locator('#serviceCount')).not.toHaveText('0');});

test('loads the canonical network and plans a local-place journey',async({page})=>{
  await expect(page.locator('#serviceCount')).toHaveText('78');
  await planCouvaToChaguanas(page);
  expect(await page.locator('.journey-leg').count()).toBeGreaterThan(0);
});

test('mode tabs re-plan the current trip without losing endpoints',async({page})=>{
  await planCouvaToChaguanas(page);
  await page.getByRole('button',{name:'Maxi',exact:true}).click();
  await expect(page.locator('#fromInput')).toHaveValue(/Couva/i);
  await expect(page.locator('#toInput')).toHaveValue(/Chaguanas/i);
  await expect(page.locator('#detailPanel')).toBeVisible();
  await expect(page.locator('#plannerStatus')).not.toContainText(/Finding routes|Loading route/);
});

test('swap preserves selected local places',async({page})=>{
  await chooseLocalPlace(page,'fromInput','Couva');
  await chooseLocalPlace(page,'toInput','Chaguanas');
  await page.getByRole('button',{name:'Swap origin and destination'}).click();
  await expect(page.locator('#fromInput')).toHaveValue(/Chaguanas/i);
  await expect(page.locator('#toInput')).toHaveValue(/Couva/i);
});

test('missing reverse service still fails clearly instead of being invented',async({page})=>{
  await chooseLocalPlace(page,'fromInput','Toco');
  await chooseLocalPlace(page,'toInput','Guayaguayare');
  await page.locator('#planButton').click();
  await expect(page.locator('#plannerStatus')).toHaveText('No route in the current network.');
  await expect(page.locator('#detailPanel')).toBeHidden();
});

test('mobile layout keeps controls and results inside the viewport',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.startsWith('mobile'));
  const width=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  for(const selector of ['#swapButton','#planButton','#modeTabs button']){
    const box=await page.locator(selector).first().boundingBox();
    expect(box?.height||0).toBeGreaterThanOrEqual(44);
  }
  await planCouvaToChaguanas(page);
  const panel=await page.locator('#detailPanel').boundingBox();
  expect(panel).not.toBeNull();
  expect(panel.y).toBeGreaterThanOrEqual(0);
  expect(panel.y+panel.height).toBeLessThanOrEqual(844);
});
