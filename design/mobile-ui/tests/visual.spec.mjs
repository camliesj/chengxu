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

test('workbench admin route uses the shared shell and keeps navigation active', async ({ page }) => {
  await page.goto('/?screen=workbench-admin');

  await expect(page.locator('[data-screen-id="workbench-admin"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: '管理员工作台' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
  await expect(page.getByRole('button', { name: '工作台' })).toHaveAttribute('aria-current', 'page');
});

test('employee workbench prioritizes operational tasks without settlement controls', async ({ page }) => {
  await page.goto('/?screen=workbench-employee');
  await expect(page.getByRole('heading', { name: '今日工作' })).toBeVisible();
  const stateBand = page.getByLabel('工单状态概览');
  await expect(stateBand.getByText('在修', { exact: true })).toBeVisible();
  await expect(stateBand.getByText('待结算', { exact: true })).toBeVisible();
  await expect(stateBand.getByText('保险到期', { exact: true })).toBeVisible();
  await expect(page.locator('[data-role-summary]')).toBeVisible();
  await expect(page.locator('[data-role-summary]')).toContainText('当班概览');
  await expect(page.locator('[data-role-summary]')).not.toContainText('经营摘要');
  await expect(page.getByRole('button', { name: '办理结算' })).toHaveCount(0);
});

test('administrator workbench adds business summary and settlement entry', async ({ page }) => {
  await page.goto('/?screen=workbench-admin');
  await expect(page.locator('[data-role-summary]')).toBeVisible();
  await expect(page.locator('[data-role-summary]')).toContainText('经营摘要');
  await expect(page.getByLabel('关键指标').getByText('本月产值')).toBeVisible();
  await expect(page.getByRole('button', { name: '办理结算' })).toBeVisible();
});

test('employee order detail can update progress but cannot settle', async ({ page }) => {
  await page.goto('/?screen=order-detail-employee');
  await expect(page.getByRole('button', { name: '切换为在修' })).toBeVisible();
  await expect(page.getByRole('button', { name: '切换为完工' })).toBeVisible();
  await expect(page.getByRole('button', { name: '标记待结算' })).toBeVisible();
  await expect(page.getByRole('button', { name: '完成结算' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '返结算' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '作废工单' })).toHaveCount(0);
});

test('administrator order detail exposes settlement actions', async ({ page }) => {
  await page.goto('/?screen=order-detail-admin');
  await expect(page.getByRole('button', { name: '完成结算' })).toBeVisible();
  await expect(page.getByRole('button', { name: '作废工单' })).toBeVisible();
});

test('filter is a bottom sheet and reverse settlement is destructive', async ({ page }) => {
  await page.goto('/?screen=orders-filter-sheet');
  await expect(page.locator('[data-overlay="bottom-sheet"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '应用筛选' })).toBeVisible();

  await page.goto('/?screen=reverse-settlement-dialog');
  await expect(page.locator('[data-overlay="confirm-dialog"]')).toBeVisible();
  await expect(page.locator('[data-tone="danger"]')).toBeVisible();
  await expect(page.getByRole('button', { name: '确认返结算' })).toBeVisible();
  await expect(page.getByText('返回待结算')).toBeVisible();
});

test('order overlay screens render only for their own screen ids', async ({ page }) => {
  await page.goto('/?screen=orders-current');
  await expect(page.locator('[data-overlay]')).toHaveCount(0);

  await page.goto('/?screen=order-status-dialog');
  await expect(page.locator('[data-screen-id="order-status-dialog"] [data-overlay="confirm-dialog"]')).toBeVisible();
  await expect(page.locator('[data-screen-id="order-status-dialog"] [data-tone="neutral"]')).toBeVisible();

  await page.goto('/?screen=receipt-upload');
  await expect(page.locator('[data-screen-id="receipt-upload"] [data-overlay="full-screen-modal"]')).toBeVisible();
});

test('settlement and receipt screens require a successful receipt upload', async ({ page }) => {
  await page.goto('/?screen=order-settlement');
  await expect(page.getByText('上传未成功前不可完成结算')).toBeVisible();
  await expect(page.getByText('回执必传')).toBeVisible();
  await expect(page.getByRole('button', { name: '去上传回执' })).toBeVisible();

  await page.goto('/?screen=receipt-upload');
  await expect(page.getByText('上传未成功前不可完成结算')).toBeVisible();
  await expect(page.locator('[data-receipt-frame]')).toBeVisible();
  await expect(page.getByText('receipt-20260715.jpg')).toBeVisible();
  await expect(page.getByRole('button', { name: '替换文件' })).toBeVisible();
  await expect(page.getByRole('button', { name: '删除文件' })).toBeVisible();
  await expect(page.getByRole('button', { name: '确认上传' })).toBeVisible();
});

for (const viewport of [
  { width: 360, height: 800 },
  { width: 412, height: 915 },
]) {
  for (const screen of ['orders-current', 'order-detail-employee', 'order-detail-admin', 'order-settlement']) {
    test(`${screen} responsive at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/?screen=${screen}`);
      const shell = page.locator('[data-mobile-shell]');
      const widths = await shell.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
      await expect(page.locator('[data-stable-action-bar]')).toBeInViewport();
    });
  }
}

for (const viewport of [
  { width: 360, height: 800 },
  { width: 412, height: 915 },
]) {
  for (const screen of ['workbench-employee', 'workbench-admin']) {
    test(`${screen} responsive at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/?screen=${screen}`);
      const shell = page.locator('[data-mobile-shell]');
      const widths = await shell.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
      await expect(page.getByRole('navigation', { name: '主导航' })).toBeInViewport();
    });
  }
}

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
