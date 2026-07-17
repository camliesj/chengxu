import { expect, test } from '@playwright/test';

const REQUIRED_STATES = ['default', 'hover', 'pressed', 'focus', 'disabled'];
const SELECTABLE_COMPONENTS = ['navigation-item', 'selection-card'];
const COMPONENTS = [
  'button',
  'icon-button',
  'navigation-item',
  'selection-card',
  'metric-card',
  'field',
  'dialog-action',
];

test('states gallery renders the complete shared interaction matrix', async ({ page }) => {
  await page.goto('/?screen=states-gallery');

  for (const component of COMPONENTS) {
    for (const state of REQUIRED_STATES) {
      await expect(
        page.locator(`[data-component="${component}"][data-force-state="${state}"]`),
        `${component} should expose ${state}`,
      ).toBeVisible();
    }
  }

  for (const component of SELECTABLE_COMPONENTS) {
    await expect(
      page.locator(`[data-component="${component}"][data-force-state="selected"]`),
    ).toBeVisible();
  }

  const disabledFixtures = page.locator('[data-force-state="disabled"]');
  await expect(disabledFixtures).toHaveCount(COMPONENTS.length);

  for (const fixture of await disabledFixtures.all()) {
    await expect(fixture.locator('button, input').first()).toBeDisabled();
  }
});

test('real shared controls expose hover, press, focus, selection and disabled semantics', async ({ page }) => {
  await page.goto('/?screen=states-gallery');

  const liveButton = page.getByRole('button', { name: '实时交互按钮' });
  const defaultBackground = await liveButton.evaluate((button) => getComputedStyle(button).backgroundColor);
  await liveButton.hover();
  await expect(liveButton).toHaveAttribute('data-interaction-ready', 'true');
  await expect.poll(() => liveButton.evaluate((button) => getComputedStyle(button).backgroundColor))
    .not.toBe(defaultBackground);

  await liveButton.focus();
  await expect(liveButton).toBeFocused();

  const forcedFocus = page.locator('[data-component="button"][data-force-state="focus"] button');
  await expect.poll(() => forcedFocus.evaluate((button) => getComputedStyle(button).outlineStyle))
    .toBe('solid');

  const forcedPressed = page.locator('[data-component="button"][data-force-state="pressed"] button');
  await expect.poll(() => forcedPressed.evaluate((button) => getComputedStyle(button).transform))
    .not.toBe('none');

  const selectable = page.getByRole('button', { name: '选择通达汽车服务中心' });
  await selectable.click();
  await expect(selectable).toHaveAttribute('aria-pressed', 'true');

  const disabled = page.getByRole('button', { name: '禁用操作' });
  await expect(disabled).toBeDisabled();
  await expect.poll(() => disabled.evaluate((button) => Number.parseFloat(getComputedStyle(button).opacity)))
    .toBeLessThan(1);
});
