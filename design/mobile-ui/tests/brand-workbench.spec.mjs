import { expect, test } from '@playwright/test';

async function login(page, viewport = { width: 390, height: 844 }) {
  await page.setViewportSize(viewport);
  await page.goto('/?prototype=brand');
  await page.getByLabel('账号').fill('worker');
  await page.getByLabel('密码', { exact: true }).fill('secret12');
  await page.getByRole('button', { name: '进入系统' }).click();
  await expect(page.getByRole('heading', { name: '今日工作' })).toBeVisible();
}

test('employee and administrator workbenches preserve role-specific metrics and permissions', async ({ page }) => {
  await login(page);

  await expect(page.getByRole('button', { name: '今日接车 12' })).toBeVisible();
  await expect(page.getByRole('button', { name: '在修车辆 18' })).toBeVisible();
  await expect(page.getByRole('button', { name: '待交付 04' })).toBeVisible();
  await expect(page.getByRole('button', { name: '保险到期 09' })).toBeVisible();
  await expect(page.getByRole('button', { name: '办理结算' })).toHaveCount(0);

  await page.getByRole('button', { name: '管理员', exact: true }).click();
  await expect(page.getByText('本月产值', { exact: true })).toBeVisible();
  await expect(page.getByText('待结算金额', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '办理结算' })).toBeVisible();

  await page.getByRole('button', { name: '我的', exact: true }).click();
  await expect(page.getByText('管理员 · 通达汽车服务中心')).toBeVisible();
  await page.getByRole('button', { name: '工作台', exact: true }).click();
  await expect(page.getByText('本月产值', { exact: true })).toBeVisible();
});

test('brand workbench cards are keyboard reachable and responsive', async ({ page }) => {
  await login(page, { width: 360, height: 800 });

  const metric = page.getByRole('button', { name: /今日接车 12/ });
  await metric.focus();
  await expect(metric).toBeFocused();

  const order = page.getByRole('button', { name: /查看工单 蒙K·Q7285/ });
  await order.focus();
  await expect(order).toBeFocused();

  const overflow = await page.locator('[data-mobile-shell]').evaluate((node) => node.scrollWidth - node.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.locator('[data-mobile-nav]')).toBeVisible();
});

test('workbench shortcuts route through the existing five-tab shell', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: '接车登记' }).click();
  await expect(page.getByRole('heading', { name: '新增工单', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '工作台', exact: true }).click();
  await page.getByRole('button', { name: '查看全部' }).click();
  await expect(page.getByRole('heading', { name: '工单中心', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '工作台', exact: true }).click();
  await page.getByRole('button', { name: '保险提醒' }).click();
  await expect(page.getByRole('heading', { name: '客户档案', exact: true })).toBeVisible();
});

test('administrator identity stays consistent and the workbench header stays compact', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '管理员', exact: true }).click();

  const subtitle = page.locator('.mobile-shell__subtitle');
  const subtitleBox = await subtitle.boundingBox();
  expect(subtitleBox?.height).toBeLessThanOrEqual(20);

  await page.getByRole('button', { name: '我的', exact: true }).click();
  await expect(page.getByRole('heading', { name: '李经理', exact: true })).toBeVisible();
});
