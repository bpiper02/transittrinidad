import {test,expect} from '@playwright/test';

test('field review previews a promotable correction without changing the map',async({page})=>{
  await page.goto('/field-review.html');
  const select=page.locator('#serviceSelect');
  await expect(select).toBeVisible();
  await expect(select.locator('option')).not.toHaveCount(0);
  await select.selectOption('maxi-chag-san-fernando-out');
  await page.locator('input[name="accuracy"][value="needs_correction"]').check();
  await page.locator('#association').fill('Route 3 field review');
  await page.locator('#reviewerRole').fill('Driver');
  await page.locator('#fare').fill('12');
  await page.locator('#boardingPolicy').selectOption('corridor_hail');
  await page.locator('#alightingPolicy').selectOption('corridor_request');
  await page.locator('#notes').fill('Roadside hail and requested drop-off confirmed for the local pattern.');
  await page.locator('#preview').click();

  const preview=page.locator('#jsonPreview');
  await expect(preview).toContainText('maxi-chag-san-fernando-out');
  await expect(preview).toContainText('needs_correction');
  await expect(preview).toContainText('corridor_hail');
  await expect(preview).toContainText('corridor_request');
  await expect(preview).toContainText('"fareTTD": 12');
  await expect(page.locator('#export')).toBeEnabled();
  await expect(page.locator('#copy')).toBeEnabled();
  await expect(page.locator('#status')).toContainText('requires promotion review');
});

test('field review blocks unknown route points from export',async({page})=>{
  await page.goto('/field-review.html');
  await page.locator('#serviceSelect').selectOption('maxi-chag-san-fernando-out');
  await page.locator('input[name="accuracy"][value="needs_correction"]').check();
  const stops=page.locator('#stops');
  const current=await stops.inputValue();
  await stops.fill(`${current}\nDefinitely Not A Transit Point`);
  await page.locator('#preview').click();
  await expect(page.locator('#status')).toContainText('is not a known network point');
  await expect(page.locator('#export')).toBeDisabled();
  await expect(page.locator('#copy')).toBeDisabled();
});

test('search narrows field review routes while preserving a usable direction',async({page})=>{
  await page.goto('/field-review.html');
  await page.locator('#serviceSearch').fill('Arima');
  const options=page.locator('#serviceSelect option');
  expect(await options.count()).toBeGreaterThan(0);
  for(const text of await options.allTextContents())expect(text.toLowerCase()).toContain('arima');
  await expect(page.locator('#routeCard')).toContainText(/Arima/i);
});
