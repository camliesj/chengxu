import { test, expect } from '@playwright/test';

test('login screen exposes company choice and credentials', async ({ page }) => {
  await page.goto('/?screen=login-company');
  await expect(page.getByRole('heading', { name: '选择门店' })).toBeVisible();
  await expect(page.getByText('通达汽车服务中心')).toBeVisible();
  await expect(page.getByText('鑫齐恒汽车服务中心')).toBeVisible();
  await expect(page.getByLabel('账号')).toBeVisible();
  await expect(page.getByLabel('密码')).toBeVisible();
  await expect(page.getByRole('button', { name: '进入系统' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '主导航' })).toHaveCount(0);
});

test('phone shell has no horizontal overflow', async ({ page }) => {
  await page.goto('/?screen=login-company');
  const widths = await page.locator('[data-mobile-shell]').evaluate((node) => ({
    client: node.clientWidth,
    scroll: node.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test('company selection switches to the second company', async ({ page }) => {
  await page.goto('/?screen=login-company');
  const firstCompany = page.getByRole('button', { name: /通达汽车服务中心/ });
  const secondCompany = page.getByRole('button', { name: /鑫齐恒汽车服务中心/ });

  await expect(firstCompany).toHaveAttribute('aria-pressed', 'true');
  await expect(secondCompany).toHaveAttribute('aria-pressed', 'false');

  await secondCompany.click();

  await expect(firstCompany).toHaveAttribute('aria-pressed', 'false');
  await expect(secondCompany).toHaveAttribute('aria-pressed', 'true');
  await expect(secondCompany.locator('[data-selected-icon="true"]')).toBeVisible();
});

test('placeholder routes use the shared shell and keep workbench-admin registered', async ({ page }) => {
  await page.goto('/?screen=workbench-admin');

  await expect(page.locator('[data-screen-id="workbench-admin"]')).toBeVisible();
  await expect(page.getByText('任务 1 占位原型')).toBeVisible();
  await expect(page.getByRole('heading', { name: '管理员工作台' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
  await expect(page.getByRole('button', { name: '工作台' })).toHaveAttribute('aria-current', 'page');
});

test('shared shell keeps bottom nav pinned while main scrolls', async ({ page }) => {
  await page.goto('/?screen=workbench-admin');

  const metrics = await page.locator('[data-mobile-shell]').evaluate((shell) => {
    const main = shell.querySelector('[data-mobile-main]');
    const nav = shell.querySelector('[data-mobile-nav]');
    if (!(main instanceof HTMLElement) || !(nav instanceof HTMLElement) || !(shell instanceof HTMLElement)) {
      return null;
    }

    const before = {
      mainScrollTop: main.scrollTop,
      mainScrollHeight: main.scrollHeight,
      mainClientHeight: main.clientHeight,
      navBottom: Math.round(nav.getBoundingClientRect().bottom),
      shellBottom: Math.round(shell.getBoundingClientRect().bottom),
    };

    main.scrollTop = Math.max(0, main.scrollHeight - main.clientHeight);

    const after = {
      mainScrollTop: main.scrollTop,
      navBottom: Math.round(nav.getBoundingClientRect().bottom),
      shellBottom: Math.round(shell.getBoundingClientRect().bottom),
    };

    return { before, after };
  });

  expect(metrics).not.toBeNull();
  expect(metrics.before.mainScrollHeight).toBeGreaterThan(metrics.before.mainClientHeight);
  expect(metrics.after.mainScrollTop).toBeGreaterThan(metrics.before.mainScrollTop);
  expect(Math.abs(metrics.before.navBottom - metrics.before.shellBottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(metrics.after.navBottom - metrics.after.shellBottom)).toBeLessThanOrEqual(1);
});

test('offline placeholder shows the offline strip inside the shared shell', async ({ page }) => {
  await page.goto('/?screen=offline-readonly');
  await expect(page.getByRole('status')).toContainText('网络不可用，当前为只读模式');
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
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
