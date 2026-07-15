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
  const statusScreen = page.locator('[data-screen-id="order-status-dialog"]');
  const statusFooter = statusScreen.locator('[data-action-footer]');
  const statusOverlay = statusScreen.locator('[data-overlay="confirm-dialog"]');
  await expect(statusOverlay).toBeVisible();
  await expect(statusScreen.locator('[data-tone="neutral"]')).toBeVisible();
  await expect(statusScreen.locator('[data-stable-action-bar]')).toBeVisible();
  await expect(statusFooter).toBeVisible();
  await expect(statusFooter.getByRole('button', { name: '切换为在修', exact: true })).toBeVisible();
  await expect(statusFooter.getByRole('button', { name: '切换为完工', exact: true })).toBeVisible();
  await expect(statusFooter.getByRole('button', { name: '标记待结算', exact: true })).toBeVisible();
  await expect(statusFooter.getByRole('button', { name: '完成结算', exact: true })).toHaveCount(0);
  await expect(statusOverlay.getByRole('button', { name: '确认切换为完工', exact: true })).toBeVisible();

  await page.goto('/?screen=receipt-upload');
  await expect(page.locator('[data-screen-id="receipt-upload"] [data-overlay="full-screen-modal"]')).toBeVisible();
});

test('reverse settlement dialog overlays a settled admin detail footer', async ({ page }) => {
  await page.goto('/?screen=reverse-settlement-dialog');
  const screen = page.locator('[data-screen-id="reverse-settlement-dialog"]');
  const footer = screen.locator('[data-action-footer]');
  const overlay = screen.locator('[data-overlay="confirm-dialog"][data-tone="danger"]');
  await expect(footer).toBeVisible();
  await expect(footer.getByRole('button', { name: '返结算', exact: true })).toBeVisible();
  await expect(footer.getByRole('button', { name: '作废工单', exact: true })).toBeVisible();
  await expect(footer.getByRole('button', { name: '完成结算', exact: true })).toHaveCount(0);
  await expect(overlay).toBeVisible();
  await expect(overlay.getByRole('button', { name: '确认返结算', exact: true })).toBeVisible();
});

test('settlement and receipt screens require a successful receipt upload', async ({ page }) => {
  await page.goto('/?screen=order-settlement');
  await expect(page.getByText('上传未成功前不可完成结算')).toBeVisible();
  await expect(page.getByRole('heading', { name: '回执必传' })).toBeVisible();
  await expect(page.getByRole('button', { name: '去上传回执' })).toBeVisible();

  await page.goto('/?screen=receipt-upload');
  await expect(page.locator('[data-overlay="full-screen-modal"]').getByRole('alert')).toContainText(
    '上传未成功前不可完成结算',
  );
  await expect(page.locator('[data-receipt-frame]')).toBeVisible();
  await expect(page.getByText('receipt-20260715.jpg')).toBeVisible();
  await expect(page.getByRole('button', { name: '替换文件' })).toBeVisible();
  await expect(page.getByRole('button', { name: '删除文件' })).toBeVisible();
  await expect(page.getByRole('button', { name: '确认上传' })).toBeVisible();
});

test('create flow exposes the correct fields and progress for every step', async ({ page }) => {
  const steps = [
    ['order-create-customer', '1 / 4', '客户与车辆'],
    ['order-create-insurance', '2 / 4', '保险与事故'],
    ['order-create-repair', '3 / 4', '维修与费用'],
    ['order-create-review', '4 / 4', '确认并提交'],
  ];

  for (const [id, progress, heading] of steps) {
    await page.goto(`/?screen=${id}`);
    await expect(page.getByText(progress)).toBeVisible();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  await page.goto('/?screen=order-create-customer');
  await expect(page.getByLabel('客户姓名')).toBeVisible();
  await expect(page.getByLabel('手机号')).toBeVisible();
  await expect(page.getByLabel('车牌号')).toBeVisible();
  await expect(page.getByLabel('车型')).toBeVisible();
  await expect(page.getByLabel('VIN')).toBeVisible();

  await page.goto('/?screen=order-create-insurance');
  await expect(page.getByLabel('保险公司')).toBeVisible();
  await expect(page.getByLabel('保险到期日（必填）')).toBeVisible();
  await expect(page.getByLabel('案件号')).toBeVisible();
  await expect(page.getByLabel('车辆类型')).toBeVisible();
  await expect(page.getByLabel('事故类型')).toBeVisible();

  await page.goto('/?screen=order-create-repair');
  await expect(page.getByLabel('维修内容')).toBeVisible();
  await expect(page.getByLabel('工时费')).toBeVisible();
  await expect(page.getByLabel('材料费')).toBeVisible();
  await expect(page.getByLabel('付款方式')).toBeVisible();
  await expect(page.getByLabel('业务员')).toBeVisible();
  await expect(page.getByLabel('进厂日期')).toBeVisible();
  await expect(page.getByLabel('进厂时间')).toBeVisible();

  await page.goto('/?screen=order-create-review');
  await expect(page.getByText('客户车辆')).toBeVisible();
  await expect(page.getByText('保险事故')).toBeVisible();
  await expect(page.getByText('维修费用')).toBeVisible();
});

test('insurance expiry is required and entry date is locked', async ({ page }) => {
  await page.goto('/?screen=order-create-insurance');
  await expect(page.getByLabel('保险到期日（必填）')).toBeVisible();

  await page.goto('/?screen=order-create-repair');
  await expect(page.getByLabel('进厂日期')).toBeDisabled();
  await expect(page.getByLabel('进厂时间')).toBeEnabled();
});

test('create flow uses requirement placeholders instead of demo data', async ({ page }) => {
  await page.goto('/?screen=order-create-customer');
  await expect(page.getByLabel('客户姓名')).toHaveAttribute('placeholder', '必填，请输入客户姓名');
  await expect(page.getByLabel('手机号')).toHaveAttribute('placeholder', '必填，请输入手机号');
  await expect(page.getByLabel('VIN')).toHaveAttribute('placeholder', '可选，请输入VIN');
  await expect(page.getByLabel('客户姓名')).not.toHaveAttribute('placeholder', /张先生/);
});

test('edit form shows tabs, real values, and no four-step progress', async ({ page }) => {
  await page.goto('/?screen=order-edit');
  await expect(page.getByRole('heading', { name: '编辑工单' })).toBeVisible();
  await expect(page.getByText('工单号 RO202607150018')).toBeVisible();
  await expect(page.getByRole('button', { name: '保存修改' })).toBeVisible();
  await expect(page.getByText('1 / 4')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: '客户车辆' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '保险事故' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '维修费用' })).toBeVisible();
  await expect(page.getByLabel('客户姓名')).toHaveValue('张先生');
  await expect(page.getByLabel('保险公司')).toHaveValue('人保财险');
  await expect(page.getByLabel('维修内容')).toHaveValue(/右前翼子板钣金喷漆/);
});

test('form layouts stay single-column on phone and avoid horizontal overflow on small screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/?screen=order-create-repair');

  const shell = page.locator('[data-mobile-shell]');
  const widths = await shell.evaluate((node) => ({
    client: node.clientWidth,
    scroll: node.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);

  await expect(page.locator('[data-form-grid]')).toHaveAttribute('data-columns', '1');
  await expect(page.locator('[data-form-header]')).toBeVisible();
  await expect(page.locator('[data-form-actions]')).toBeInViewport();
});

test('form layouts use two columns on tablet', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/?screen=order-create-insurance');
  await expect(page.locator('[data-form-grid]')).toHaveAttribute('data-columns', '2');
});

for (const viewport of [
  { width: 360, height: 800 },
  { width: 412, height: 915 },
]) {
  for (const [screen, selector] of [
    ['orders-current', '[aria-label="打开工单筛选"]'],
    ['order-detail-employee', '[data-stable-action-bar]'],
    ['order-detail-admin', '[data-stable-action-bar]'],
    ['order-settlement', '[data-stable-action-bar]'],
  ]) {
    test(`${screen} responsive at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/?screen=${screen}`);
      const shell = page.locator('[data-mobile-shell]');
      const widths = await shell.evaluate((node) => ({
        client: node.clientWidth,
        scroll: node.scrollWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
      await expect(page.locator(selector)).toBeInViewport();
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
