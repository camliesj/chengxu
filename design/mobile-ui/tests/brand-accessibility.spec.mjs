import { expect, test } from '@playwright/test';

async function login(page, suffix = '') {
  await page.goto(`/?prototype=brand${suffix}`);
  await page.getByLabel('账号').fill('worker');
  await page.getByLabel('密码', { exact: true }).fill('secret12');
  await page.getByRole('button', { name: '进入系统' }).click();
  await expect(page.getByRole('heading', { name: '今日工作' })).toBeVisible();
}

test('brand workbench exposes 48px targets, visible focus and non-color selection semantics', async ({ page }) => {
  await login(page);

  const controls = page.locator('[data-mobile-main] button:visible, [data-mobile-nav] button:visible');
  for (const control of await controls.all()) {
    const box = await control.boundingBox();
    expect(box?.height, await control.getAttribute('aria-label') ?? await control.textContent())
      .toBeGreaterThanOrEqual(48);
  }

  const selectedRole = page.getByRole('button', { name: '员工', exact: true });
  await expect(selectedRole).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '工作台', exact: true })).toHaveAttribute('aria-current', 'page');

  const viewAll = page.getByRole('button', { name: '查看全部' });
  for (let index = 0; index < 20 && !(await viewAll.evaluate((node) => node === document.activeElement)); index += 1) {
    await page.keyboard.press('Tab');
  }
  await expect(viewAll).toBeFocused();
  await expect.poll(() => viewAll.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe('solid');
});

test('offline disabled navigation cannot change tabs', async ({ page }) => {
  await login(page, '&offline=1');
  const add = page.getByRole('button', { name: '新增', exact: true });
  await expect(add).toBeDisabled();
  await add.evaluate((node) => node.click());
  await expect(page.getByRole('heading', { name: '今日工作' })).toBeVisible();
  await expect(page.getByRole('button', { name: '工作台', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('logout dialog traps focus and returns it to the trigger', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '我的', exact: true }).click();
  const trigger = page.getByRole('button', { name: '退出登录' });
  await trigger.click();

  const cancel = page.getByRole('button', { name: '暂不退出' });
  const confirm = page.getByRole('button', { name: '退出登录', exact: true }).last();
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(confirm).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
]) {
  test(`brand workbench remains reachable and overflow-free at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page);

    const overflow = await page.locator('[data-mobile-shell]').evaluate((node) => node.scrollWidth - node.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.locator('[data-mobile-nav]')).toBeVisible();
    await expect(page.getByRole('button', { name: '接车登记' })).toBeAttached();
  });
}
