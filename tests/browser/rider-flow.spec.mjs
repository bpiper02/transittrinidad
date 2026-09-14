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
  await page.route('https://photon.komoot.io/api**',route=>{
    const url=new URL(route.request().url());
    const query=url.searchParams.get('q')||'';
    const features=/point fortin/i.test(query)?[{
      type:'Feature',
      geometry:{type:'Point',coordinates:[-61.6818878,10.1739316]},
      properties:{name:'Point Fortin',city:'Point Fortin',country:'Trinidad and Tobago'}
    }]:[];
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({features})});
  });
  await page.route('https://router.project-osrm.org/route/v1/driving/**',route=>{
    const url=new URL(route.request().url());
    const coordinatePair=url.pathname.split('/').at(-1).split(';');
    const coordinates=coordinatePair.map(value=>value.split(',').map(Number));
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({routes:[{duration:900,distance:12000,geometry:{coordinates}}]})});
  });
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

async function planNamedTrip(page,from,to){
  await page.locator('#fromInput').fill(from);
  await page.locator('#toInput').fill(to);
  await page.locator('#planButton').click();
  await expect(page.locator('#detailPanel')).toBeVisible();
  await expect(page.locator('#detailPanel h2')).toContainText(from);
  await expect(page.locator('#detailPanel h2')).toContainText(to);
  await expect(page.locator('#plannerStatus')).not.toContainText(/Finding routes|Loading route/);
}

async function planCouvaToChaguanas(page){
  await chooseLocalPlace(page,'fromInput','Couva');
  await chooseLocalPlace(page,'toInput','Chaguanas');
  await page.locator('#planButton').click();
  await expect(page.locator('#detailPanel')).toBeVisible();
  await expect(page.locator('#plannerStatus')).not.toContainText(/Finding routes|Loading route/);
}

async function renderedTransitCoordinates(page){
  return page.evaluate(()=>{
    const features=globalThis.__testMap?.getSource('journey')?.data?.features||[];
    return features.filter(feature=>feature.properties?.kind==='transit').flatMap(feature=>feature.geometry?.coordinates||[]);
  });
}

async function endpointLocation(page,name){
  return page.evaluate(async endpointName=>{
    const [places,nodes]=await Promise.all([
      fetch('/data/places.json').then(response=>response.json()),
      fetch('/data/nodes.json').then(response=>response.json())
    ]);
    return places.find(place=>place.name===endpointName)?.location||nodes.find(node=>node.name===endpointName)?.location||null;
  },name);
}

async function attachJourneyAudit(page,testInfo,label){
  const safeLabel=label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const coordinates=await renderedTransitCoordinates(page);
  await testInfo.attach(`${safeLabel}-screen.png`,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await testInfo.attach(`${safeLabel}-transit-coordinates.json`,{body:JSON.stringify(coordinates,null,2),contentType:'application/json'});
  return coordinates;
}

function expectJourneyGeometryNearEndpoints(coordinates,from,to,{latPad=.04,lngPad=.04}={}){
  expect(coordinates.length).toBeGreaterThan(1);
  const minLat=Math.min(from.lat,to.lat)-latPad,maxLat=Math.max(from.lat,to.lat)+latPad;
  const minLng=Math.min(from.lng,to.lng)-lngPad,maxLng=Math.max(from.lng,to.lng)+lngPad;
  for(const [lng,lat] of coordinates){
    expect(lat).toBeGreaterThanOrEqual(minLat);
    expect(lat).toBeLessThanOrEqual(maxLat);
    expect(lng).toBeGreaterThanOrEqual(minLng);
    expect(lng).toBeLessThanOrEqual(maxLng);
  }
}

test.beforeEach(async({page})=>{await primeNetwork(page);await page.goto('/');await expect(page.locator('#serviceCount')).not.toHaveText('0');});

test('loads the canonical network and plans a local-place journey',async({page})=>{
  await expect(page.locator('#serviceCount')).toHaveText('102');
  await planCouvaToChaguanas(page);
  expect(await page.locator('.journey-leg').count()).toBeGreaterThan(0);
});

test('every planned transit journey displays a fare or explicit estimate',async({page})=>{
  await planCouvaToChaguanas(page);
  await expect(page.locator('#detailPanel')).toContainText(/TT\$/);
  await expect(page.locator('#plannerStatus')).toContainText(/TT\$/);
  await expect(page.locator('#detailPanel')).not.toContainText(/Fare unknown|fare not in dataset/i);
});

test('local corridor directions explain roadside hail and requested drop-off',async({page})=>{
  await page.locator('#fromInput').fill('California');
  await page.locator('#toInput').fill('Claxton Bay');
  await page.locator('#planButton').click();
  const panel=page.locator('#detailPanel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Hail the Route 3 / Green Band');
  await expect(panel).toContainText('Hail at California in the service direction');
  await expect(panel).toContainText('Tell the driver you’re getting off at Claxton Bay');
  await expect(panel).toContainText(/TT\$/);
});

test('San Juan to Port of Spain pass-through journey hides virtual ids and draws transit geometry',async({page},testInfo)=>{
  await chooseLocalPlace(page,'fromInput','San Juan');
  await chooseLocalPlace(page,'toInput','Port of Spain');
  await page.locator('#planButton').click();
  const panel=page.locator('#detailPanel');
  await expect(panel).toBeVisible();
  await expect(page.locator('#plannerStatus')).not.toContainText(/No route|Finding routes|Loading route/);
  await expect(panel).toContainText('estimated main-road boarding area');
  await expect(panel).toContainText('Use a visible, legal, well-lit place');
  await expect(panel).not.toContainText(/virtual-(boarding|alighting)/);
  const coordinates=await attachJourneyAudit(page,testInfo,'San Juan to Port of Spain pass-through');
  expect(coordinates.length).toBeGreaterThan(1);
});

test('Point Fortin to Fyzabad does not invent or highlight an unsupported journey',async({page},testInfo)=>{
  await chooseLocalPlace(page,'fromInput','Point Fortin');
  await chooseLocalPlace(page,'toInput','Fyzabad');
  await page.locator('#planButton').click();
  await expect(page.locator('#plannerStatus')).toHaveText('No route in the current network.');
  await expect(page.locator('#detailPanel')).toBeHidden();
  const coordinates=await attachJourneyAudit(page,testInfo,'Point Fortin to Fyzabad');
  expect(coordinates).toHaveLength(0);
});

test('California to Arima highlighted geometry does not trail south past boarding',async({page},testInfo)=>{
  const fromName='California',toName='Arima PTSC Transit Hub';
  await planNamedTrip(page,fromName,toName);
  const [coordinates,from,to]=await Promise.all([attachJourneyAudit(page,testInfo,'California to Arima'),endpointLocation(page,fromName),endpointLocation(page,toName)]);
  expect(from).not.toBeNull();expect(to).not.toBeNull();
  expectJourneyGeometryNearEndpoints(coordinates,from,to,{latPad:.035,lngPad:.05});
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
