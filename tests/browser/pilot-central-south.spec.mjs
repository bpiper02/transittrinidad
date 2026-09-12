import {test,expect} from '@playwright/test';

test('Central-South pilot renders five live journey reviews',async({page})=>{
  await page.goto('/pilot-central-south.html');
  await expect(page.locator('h1')).toContainText('Does this journey actually work?');
  await expect(page.locator('.journey')).toHaveCount(5);
  const first=page.locator('[data-journey-id="c1-california-claxton"]');
  await expect(first).toContainText(/California/i);
  await expect(first).toContainText(/Claxton Bay/i);
  await expect(first).toContainText(/Route 3 \/ Green Band/i);
  await expect(first).toContainText(/Hail|Take/i);
  await expect(first).toContainText(/TT\$/i);
  await expect(page.locator('[data-journey-id="c1-claxton-chag-reverse-probe"]')).toContainText(/reverse-direction probe/i);
});

test('Central-South pilot exports only explicit reviewer answers',async({page})=>{
  await page.goto('/pilot-central-south.html');
  await page.locator('#reviewerRole').fill('Route 3 driver');
  const card=page.locator('[data-journey-id="c1-california-claxton"]');
  for(const key of ['routeTruth','boardingTruth','fareTruth','instructionTruth'])await card.locator(`input[name="c1-california-claxton-${key}"][value="correct"]`).check();
  await card.locator('[data-field="actualFareTTD"]').fill('5');
  await page.locator('#preview').click();
  await expect(page.locator('#jsonPreview')).toBeVisible();
  await expect(page.locator('#jsonPreview')).toContainText('c1-central-south-2026-09');
  await expect(page.locator('#jsonPreview')).toContainText('c1-california-claxton');
  await expect(page.locator('#jsonPreview')).toContainText('Route 3 driver');
  await expect(page.locator('#completion')).toContainText('1 of 5 journeys fully reviewed');
  await expect(page.locator('#download')).toBeEnabled();
});

test('Central-South pilot requires reviewer role before export',async({page})=>{
  await page.goto('/pilot-central-south.html');
  const card=page.locator('[data-journey-id="c1-california-claxton"]');
  for(const key of ['routeTruth','boardingTruth','fareTruth','instructionTruth'])await card.locator(`input[name="c1-california-claxton-${key}"][value="unsure"]`).check();
  await page.locator('#preview').click();
  await expect(page.locator('#status')).toContainText(/reviewer role/i);
  await expect(page.locator('#download')).toBeDisabled();
});
