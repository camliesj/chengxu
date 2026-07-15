import { test, expect } from '@playwright/test';

test('renders login-company placeholder for a valid screen id', async ({ page }) => {
  await page.goto('/?screen=login-company');

  await expect(page.locator('[data-screen-id="login-company"]')).toBeVisible();
  await expect(page.getByText('登录与公司选择')).toBeVisible();
});

test('renders workbench-admin placeholder for another valid screen id', async ({ page }) => {
  await page.goto('/?screen=workbench-admin');

  await expect(page.locator('[data-screen-id="workbench-admin"]')).toBeVisible();
  await expect(page.getByText('管理员工作台')).toBeVisible();
});

test('renders unknown screen state for invalid ids', async ({ page }) => {
  await page.goto('/?screen=invalid-id');

  await expect(page.getByText('Unknown screen')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'invalid-id' })).toBeVisible();
});
