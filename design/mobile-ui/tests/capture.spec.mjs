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

async function loginBrandPrototype(page, suffix = '') {
  await page.goto(`/?prototype=brand${suffix}`);
  await page.getByLabel('账号').fill('worker');
  await page.getByLabel('密码', { exact: true }).fill('secret12');
  await page.getByRole('button', { name: '进入系统' }).click();
  await expect(page.getByRole('heading', { name: '今日工作' })).toBeVisible();
}

async function captureBrandPrototype(page, name) {
  await page.screenshot({
    path: join(output, `brand-prototype-${name}.png`),
    fullPage: false,
    animations: 'disabled',
  });
}

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

test('capture stateful brand prototype login', async ({ page }) => {
  await page.goto('/?prototype=brand');
  await expect(page.getByRole('heading', { name: '登录维修业务移动端' })).toBeVisible();
  await captureBrandPrototype(page, 'login');
});

test('capture stateful brand prototype employee and administrator workbenches', async ({ page }) => {
  await loginBrandPrototype(page);
  await captureBrandPrototype(page, 'workbench-employee');
  await page.getByRole('button', { name: '管理员', exact: true }).click();
  await expect(page.getByRole('heading', { name: '经营工作台' })).toBeVisible();
  await captureBrandPrototype(page, 'workbench-admin');
});

test('capture stateful brand prototype profile and logout dialog', async ({ page }) => {
  await loginBrandPrototype(page);
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await expect(page.getByRole('heading', { name: '我的账户' })).toBeVisible();
  await captureBrandPrototype(page, 'profile');
  await page.getByRole('button', { name: '退出登录' }).click();
  await expect(page.getByRole('dialog', { name: '确认退出登录' })).toBeVisible();
  await captureBrandPrototype(page, 'logout-dialog');
});

test('capture stateful brand prototype offline shell', async ({ page }) => {
  await loginBrandPrototype(page, '&offline=1');
  await expect(page.getByRole('button', { name: '新增', exact: true })).toBeDisabled();
  await captureBrandPrototype(page, 'offline');
});

for (const state of ['hover', 'pressed', 'focus', 'disabled']) {
  test(`capture shared brand ${state} state`, async ({ page }) => {
    await page.goto('/?screen=states-gallery');
    const fixture = page.locator(`[data-component="button"][data-force-state="${state}"]`);
    await fixture.scrollIntoViewIfNeeded();
    await expect(fixture).toBeVisible();
    await page.screenshot({
      path: join(output, `states-gallery-${state}.png`),
      fullPage: false,
      animations: 'disabled',
    });
  });
}
