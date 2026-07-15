import { test, expect } from '@playwright/test';

test('login screen exposes company choice and credentials', async ({ page }) => {
  await page.goto('/?screen=login-company');
  await expect(page.getByRole('heading', { name: '选择门店' })).toBeVisible();
  await expect(page.getByText('通达汽车服务中心')).toBeVisible();
  await expect(page.getByText('鑫齐恒汽车服务中心')).toBeVisible();
  await expect(page.getByLabel('账号')).toBeVisible();
  await expect(page.getByLabel('密码')).toBeVisible();
  await expect(page.getByRole('button', { name: '进入系统' })).toBeVisible();
});

test('phone shell has no horizontal overflow', async ({ page }) => {
  await page.goto('/?screen=login-company');
  const widths = await page.locator('[data-mobile-shell]').evaluate((node) => ({
    client: node.clientWidth,
    scroll: node.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
]) {
  test(`login responsive at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?screen=login-company');
    const shell = page.locator('[data-mobile-shell]');
    const widths = await shell.evaluate((node) => ({
      client: node.clientWidth,
      scroll: node.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    await expect(page.getByRole('button', { name: '进入系统' })).toBeInViewport();
  });
}
