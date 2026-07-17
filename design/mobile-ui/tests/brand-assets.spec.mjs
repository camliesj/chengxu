import { expect, test } from '@playwright/test';

test('brand screens use Hugeicons and load declared image assets', async ({ page }) => {
  await page.goto('/?screen=states-gallery');

  await expect(page.locator('[data-brand-icon]')).not.toHaveCount(0);
  await expect(page.locator('.lucide')).toHaveCount(0);

  const assets = page.locator('[data-brand-asset]');
  await expect(assets).toHaveCount(2);

  const invalidAssets = await assets.evaluateAll((images) =>
    images.filter((image) => {
      const isTransparentPng = image.currentSrc.endsWith('.png');
      return !isTransparentPng || image.naturalWidth === 0 || image.naturalHeight === 0;
    }).length,
  );

  expect(invalidAssets).toBe(0);
});
