import { expect, test } from '@playwright/test';

const session = {
  token: 'e2e-status-token', companyId: 'tongda', role: 'staff', label: '状态测试员工', displayName: '状态测试员工',
};

const order = {
  id: 'RO-STATUS-1', companyId: 'tongda', version: 4, status: '在修中', date: '2026-07-22', time: '09:30',
  customer: '王先生', phone: '15000000000', plate: '蒙A12345', car: '小鹏 P7+', staff: '张工',
  insuranceExpiry: '2027-07-22', insurer: '人保财险', type: '标的车', accidentType: '常规维修', claimNo: '',
  record: '前保险杠修复', labor: 1200, material: 800, amount: 2000, paymentMethod: '待确认', delivery: '', remark: '', settlementDate: '', settlementTime: '', settlementRemark: '',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((storedSession) => {
    localStorage.clear();
    localStorage.setItem('shop-access-granted', 'true');
    localStorage.setItem('chengxu-access-session', JSON.stringify(storedSession));
  }, session);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/api/health') return json({ ok: true });
    if (path === '/api/orders' && request.method() === 'GET') return json({
      orders: [order], capabilities: ['VIEW_ORDERS', 'ADVANCE_ORDER_STATUS'], serverTime: '2026-07-22T09:30:00.000Z',
    });
    if (path === '/api/insurance-policies' || path === '/api/customer-vehicles' || path === '/api/dictionaries') return json({ policies: [], vehicles: [], dictionaries: [] });
    return json({});
  });
});

test('staff confirms its only adjacent ordinary status transition once', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/orders/RO-STATUS-1/status', async (route) => {
    requests += 1;
    const payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      order: { ...order, status: payload.targetStatus, version: 5 }, operation: { id: payload.operationId, state: 'completed' },
    }) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '维修接待' }).click();
  await page.getByRole('button', { name: '查看', exact: true }).click();
  await expect(page.getByRole('button', { name: '切为完工', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '切为在修', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '待结算', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '切为完工', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '确认工单状态变更' });
  await expect(dialog).toContainText('RO-STATUS-1');
  await expect(dialog).toContainText('蒙A12345');
  await dialog.getByRole('button', { name: '确认切换' }).dblclick();
  await expect.poll(() => requests).toBe(1);
  await expect(page.getByRole('button', { name: '待结算', exact: true })).toBeVisible();
});

test('a status conflict renders the latest status and closes the stale confirmation', async ({ page }) => {
  await page.route('**/api/orders/RO-STATUS-1/status', async (route) => route.fulfill({
    status: 409,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'ORDER_STATUS_CONFLICT', order: { ...order, version: 5, status: '待结算' } }),
  }));
  await page.goto('/');
  await page.getByRole('button', { name: '维修接待' }).click();
  await page.getByRole('button', { name: '查看', exact: true }).click();
  await page.getByRole('button', { name: '切为完工', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '确认工单状态变更' });
  await dialog.getByRole('button', { name: '确认切换' }).click();
  await expect(dialog).toContainText('最新状态：待结算');
  await dialog.getByRole('button', { name: '返回最新详情' }).click();
  await expect(page.getByRole('dialog', { name: /工单详情/ })).toContainText('待结算');
});

test('unknown status result is queried with the original operation before the detail is updated', async ({ page }) => {
  let operationId = '';
  await page.route('**/api/orders/RO-STATUS-1/status', async (route) => {
    operationId = route.request().postDataJSON().operationId;
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'INTERNAL_ERROR' }) });
  });
  await page.route('**/api/order-operations/change-order-status/*', async (route) => {
    expect(new URL(route.request().url()).pathname).toContain(operationId);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      state: 'completed', order: { ...order, status: '已完工', version: 5 },
    }) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '维修接待' }).click();
  await page.getByRole('button', { name: '查看', exact: true }).click();
  await page.getByRole('button', { name: '切为完工', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '确认工单状态变更' });
  await dialog.getByRole('button', { name: '确认切换' }).click();
  await expect(dialog.getByRole('button', { name: '确认提交结果' })).toBeVisible();
  await dialog.getByRole('button', { name: '确认提交结果' }).click();
  await expect(page.getByRole('dialog', { name: /工单详情/ })).toContainText('已完工');
});
