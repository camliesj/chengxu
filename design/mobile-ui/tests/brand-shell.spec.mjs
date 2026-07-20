import { expect, test } from '@playwright/test';

async function login(page, suffix = '') {
  await page.goto(`/?prototype=brand${suffix}`);
  await page.getByLabel('账号').fill('worker');
  await page.getByLabel('密码', { exact: true }).fill('secret12');
  await page.getByRole('button', { name: '进入系统' }).click();
  await expect(page.getByRole('heading', { name: '今日工作' })).toBeVisible();
}

test('five-tab shell navigates with current-state semantics and minimum targets', async ({ page }) => {
  await login(page);

  const destinations = [
    ['工作台', '今日工作'],
    ['工单', '工单中心'],
    ['新增', '新增工单'],
    ['档案', '客户档案'],
    ['我的', '我的账户'],
  ];

  for (const [tab, heading] of destinations) {
    const control = page.getByRole('button', { name: tab, exact: true });
    await control.click();
    await expect(control).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }

  const addBox = await page.getByRole('button', { name: '新增', exact: true }).boundingBox();
  expect(addBox.width).toBeGreaterThanOrEqual(48);
  expect(addBox.height).toBeGreaterThanOrEqual(48);
});

test('logout dialog restores focus on cancel and clears the authenticated shell on confirm', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '我的', exact: true }).click();

  const trigger = page.getByRole('button', { name: '退出登录' });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: '确认退出登录' })).toBeVisible();
  await expect(page.getByRole('button', { name: '暂不退出' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '确认退出登录' })).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole('button', { name: '退出登录', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: '登录维修业务移动端' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '主导航' })).toHaveCount(0);
});

test('offline prototype disables the central add destination', async ({ page }) => {
  await login(page, '&offline=1');
  await expect(page.getByRole('button', { name: '新增', exact: true })).toBeDisabled();
  await expect(page.getByText('网络不可用，当前为只读模式')).toBeVisible();
});
