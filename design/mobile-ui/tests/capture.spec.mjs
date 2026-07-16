import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCREEN_CATALOG } from '../src/screen-catalog.js';

const output = fileURLToPath(new URL('../output/', import.meta.url));

const atlasFiles = {
  'auth-workbench': 'atlas-01-auth-workbench.png',
  'orders-overlays': 'atlas-02-orders-overlays.png',
  'create-edit-flow': 'atlas-03-create-edit-flow.png',
  'records-system': 'atlas-04-records-system.png',
};

test.beforeAll(async () => mkdir(output, { recursive: true }));

for (const screen of SCREEN_CATALOG) {
  test(`capture ${screen.id}`, async ({ page }) => {
    await page.goto(`/?screen=${screen.id}`);
    await expect(page.locator('[data-screen-id]')).toHaveAttribute('data-screen-id', screen.id);
    await page.screenshot({
      path: join(output, `${screen.id}.png`),
      fullPage: false,
      animations: 'disabled',
    });
  });
}

for (const [group, file] of Object.entries(atlasFiles)) {
  test(`atlas ${group}`, async ({ page }) => {
    await page.setViewportSize({ width: 1680, height: 1200 });
    await page.goto(`/?atlas=${group}`);
    await expect(page.locator('[data-atlas-group]')).toHaveAttribute('data-atlas-group', group);
    await page.screenshot({
      path: join(output, file),
      fullPage: true,
      animations: 'disabled',
    });
  });
}
