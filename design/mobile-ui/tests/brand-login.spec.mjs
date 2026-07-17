import { expect, test } from '@playwright/test';

async function openPrototype(page, viewport = { width: 390, height: 844 }) {
  await page.setViewportSize(viewport);
  await page.goto('/?prototype=brand');
}

test('brand login validates empty credentials and supports password visibility', async ({ page }) => {
  await openPrototype(page);

  await page.getByLabel('账号').fill('');
  await page.getByLabel('密码', { exact: true }).fill('');
  await page.getByRole('button', { name: '进入系统' }).click();
  await expect(page.getByText('请输入账号')).toBeVisible();
  await expect(page.getByText('请输入密码')).toBeVisible();

  await page.getByLabel('密码', { exact: true }).fill('secret12');
  await page.getByRole('button', { name: '显示密码' }).click();
  await expect(page.getByLabel('密码', { exact: true })).toHaveAttribute('type', 'text');
  await expect(page.locator('body')).not.toContainText('secret12');
});

test('brand journey selects a company, submits with Enter and reaches workbench', async ({ page }) => {
  await openPrototype(page);

  await page.getByRole('button', { name: '选择鑫齐恒汽车服务中心' }).click();
  await expect(page.getByRole('button', { name: '选择鑫齐恒汽车服务中心' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('账号').fill('worker');
  await page.getByLabel('密码', { exact: true }).fill('secret12');
  await page.getByLabel('密码', { exact: true }).press('Enter');

  await expect(page.getByRole('button', { name: '正在登录' })).toBeDisabled();
  await expect(page.getByLabel('账号')).toBeDisabled();
  await expect(page.getByRole('heading', { name: '今日工作' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('secret12');
});

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
]) {
  test(`brand login remains reachable without horizontal overflow at ${viewport.width}`, async ({ page }) => {
    await openPrototype(page, viewport);

    await expect(page.getByRole('button', { name: '进入系统' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
