import {test,expect} from '@playwright/test';

const mapLibreStub=`
export class LngLatBounds { constructor(){} extend(){return this;} isEmpty(){return true;} }
export class NavigationControl { constructor(){} }
export class Map { constructor(){} addControl(){} addSource(){} addLayer(){} getSource(){return null;} getCanvas(){return{style:{}};} fitBounds(){} isStyleLoaded(){return false;} on(){} }
`;

async function primeMap(page){
  await page.route('https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.mjs',route=>route.fulfill({status:200,contentType:'text/javascript',body:mapLibreStub}));
  await page.route('https://unpkg.com/maplibre-gl@6.8.0/dist/maplibre-gl.css',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
}

test('malformed runtime transit data fails atomically and disables unusable controls',async({page})=>{
  await primeMap(page);
  await page.route('**/data/services.json',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}));
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));

  await page.goto('/');

  await expect(page.locator('#plannerStatus')).toHaveText('Transport data failed to load.');
  await expect(page.locator('#fromInput')).toBeDisabled();
  await expect(page.locator('#toInput')).toBeDisabled();
  await expect(page.locator('#swapButton')).toBeDisabled();
  await expect(page.locator('#planButton')).toBeDisabled();
  for(const button of await page.locator('#modeTabs button').all())await expect(button).toBeDisabled();
  await expect(page.locator('#trayToggle')).toBeDisabled();
  await expect(page.locator('#serviceCount')).toHaveText('0');
  expect(pageErrors).toEqual([]);
});
