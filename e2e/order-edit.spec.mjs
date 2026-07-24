import { expect, test } from '@playwright/test';

const session = {
  token: 'e2e-edit-token', companyId: 'tongda', role: 'admin', label: '测试管理员', displayName: '测试管理员',
};

const order = {
  id: 'RO-E2E-1', companyId: 'tongda', version: 4, status: '在修中', date: '2026-07-22', time: '09:30',
  customer: '王先生', phone: '15000000000', plate: '蒙K12345', car: '小鹏 P7+', vin: '', staff: '张工',
  insuranceExpiry: '2027-07-22', insurer: '人保财险', type: '标的车', accidentType: '常规维修', claimNo: '',
  record: '前保险杠修复', labor: 1200, material: 800, laborCents: 120000, materialCents: 80000,
  amount: 2000, paymentMethod: '待确认', delivery: '', remark: '', settlementDate: '', settlementTime: '', settlementRemark: '',
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
      orders: [order], capabilities: ['VIEW_ORDERS', 'EDIT_ORDER'], serverTime: '2026-07-22T09:30:00.000Z',
    });
    if (path === '/api/order-creation-metadata') return json({
      metadata: { contractVersion: 1, requiredFields: ['customer', 'phone', 'plate', 'car', 'insuranceExpiry', 'record'], defaults: {}, options: { insurers: ['人保财险'], staff: [{ name: '张工', title: '服务顾问' }], vehicleTypes: ['标的车'], accidentTypes: ['常规维修'] }, maxLengths: {} },
      capabilities: ['VIEW_ORDERS', 'EDIT_ORDER'], canCreate: false,
    });
    if (path === '/api/insurance-policies' || path === '/api/customer-vehicles' || path === '/api/dictionaries') return json({ policies: [], vehicles: [], dictionaries: [] });
    return json({});
  });
});

test('EDIT_ORDER opens a four-step wizard without a status control', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '维修接待' }).click();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /编辑维修工单/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '客户与车辆' })).toBeVisible();
  await expect(dialog.locator('select[name="status"]')).toHaveCount(0);
});

test('without EDIT_ORDER the edit entry is not enabled', async ({ page }) => {
  await page.route('**/api/orders', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ orders: [order], capabilities: ['VIEW_ORDERS'], serverTime: '' }) }));
  await page.goto('/');
  await page.getByRole('button', { name: '维修接待' }).click();
  await expect(page.getByRole('button', { name: '编辑当前工单' })).toHaveCount(0);
});

test('a successful PATCH replaces the order with the returned server version', async ({ page }) => {
  await page.route('**/api/orders/RO-E2E-1', async (route) => {
    const payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      order: { ...order, ...payload.order, version: 5, labor: payload.order.laborCents / 100, material: payload.order.materialCents / 100 },
      operation: { id: payload.operationId, state: 'completed' },
    }) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '维修接待' }).click();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '编辑维修工单' });
  await dialog.getByLabel('客户姓名 *').fill('服务端客户');
  await dialog.getByRole('button', { name: '下一步' }).click();
  await dialog.getByRole('button', { name: '下一步' }).click();
  await dialog.getByRole('button', { name: '下一步' }).click();
  await dialog.getByRole('button', { name: '确认并保存' }).click();
  await expect(page.getByRole('dialog', { name: /工单详情/ })).toContainText('服务端客户');
});

test('a conflict renders an explicit rebase choice without another PATCH', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/orders/RO-E2E-1', async (route) => {
    requests += 1;
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({
      error: 'ORDER_VERSION_CONFLICT', order: { ...order, version: 5, record: '服务端记录' }, conflictingFields: ['record'],
    }) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '维修接待' }).click();
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '编辑维修工单' });
  await dialog.getByRole('button', { name: '下一步' }).click();
  await dialog.getByRole('button', { name: '下一步' }).click();
  await dialog.getByLabel('维修项目 *').fill('本地记录');
  await dialog.getByRole('button', { name: '下一步' }).click();
  await dialog.getByRole('button', { name: '确认并保存' }).click();
  await expect(dialog.getByRole('button', { name: '基于最新版本继续编辑' })).toBeVisible();
  await expect(dialog).toContainText('服务端记录');
  await dialog.getByRole('button', { name: '基于最新版本继续编辑' }).click();
  await expect(dialog.getByRole('button', { name: '确认并保存' })).toBeVisible();
  await expect.poll(() => requests).toBe(1);
});
