import { expect, test } from '@playwright/test';

const session = {
  token: 'e2e-token',
  companyId: 'tongda',
  role: 'admin',
  label: '测试管理员',
  displayName: '测试管理员',
};

const metadata = {
  contractVersion: 1,
  requiredFields: ['customer', 'phone', 'plate', 'car', 'insuranceExpiry', 'record'],
  defaults: {
    insurer: '人保财险',
    staff: '张工',
    type: '标的车',
    accidentType: '常规维修',
    delivery: '',
    laborCents: 0,
    materialCents: 0,
    remark: '',
  },
  options: {
    insurers: ['人保财险', '平安财险'],
    staff: [{ name: '张工', title: '服务顾问' }],
    vehicleTypes: ['标的车', '三者车'],
    accidentTypes: ['常规维修', '单方事故'],
  },
  maxLengths: {},
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((storedSession) => {
    localStorage.clear();
    localStorage.setItem('shop-access-granted', 'true');
    localStorage.setItem('chengxu-access-session', JSON.stringify(storedSession));
  }, session);

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const json = (body, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

    if (path === '/api/health') return json({ ok: true });
    if (path === '/api/orders' && method === 'GET') return json({
      orders: [], capabilities: ['VIEW_ORDERS', 'CREATE_ORDER'], serverTime: '2026-07-22T09:30:00.000Z',
    });
    if (path === '/api/insurance-policies' && method === 'GET') return json({ policies: [] });
    if (path === '/api/customer-vehicles' && method === 'GET') return json({ vehicles: [] });
    if (path === '/api/dictionaries' && method === 'GET') return json({ dictionaries: [] });
    if (path === '/api/order-creation-metadata') {
      return json({ metadata, capabilities: ['VIEW_ORDERS', 'CREATE_ORDER'], canCreate: true });
    }
    if (path === '/api/orders/create' && method === 'POST') {
      const body = request.postDataJSON();
      const draft = body.order;
      return json({
        order: {
          ...draft,
          id: 'RO20260700001',
          companyId: 'tongda',
          status: '在修中',
          date: '2026-07-22',
          time: '09:30',
          labor: draft.laborCents / 100,
          material: draft.materialCents / 100,
          amount: (draft.laborCents + draft.materialCents) / 100,
          paymentMethod: '待确认',
          settlementDate: '',
          settlementTime: '',
          settlementRemark: '',
          voided: false,
          version: 1,
        },
      }, 201);
    }
    if (path === '/api/customer-vehicles' && method === 'POST') {
      return json({ vehicle: request.postDataJSON().vehicle });
    }
    if (path === '/api/insurance-policies' && method === 'POST') {
      return json({ policy: request.postDataJSON().policy });
    }
    return json({});
  });
});

test('creates a server-numbered order through the production four-step flow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '维修接待' }).click();
  await page.getByRole('button', { name: '新增工单', exact: true }).first().click();

  const dialog = page.locator('.order-wizard');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('正式工单号将在提交成功后由系统生成')).toBeVisible();

  await dialog.getByLabel('客户姓名 *').fill('王先生');
  await dialog.getByLabel('手机号 *').fill('15000000000');
  await dialog.getByLabel('车牌号 *').fill('蒙K12345');
  await dialog.getByLabel('车型 *').fill('小鹏 P7+');
  await dialog.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByRole('dialog', { name: '保险与事故' })).toBeVisible();

  await dialog.getByLabel('保险到期日 *').fill('2027-07-22');
  await dialog.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByRole('dialog', { name: '维修与费用' })).toBeVisible();

  await dialog.getByLabel('维修项目 *').fill('前保险杠修复并喷漆');
  await dialog.getByLabel('工时费').fill('1200.50');
  await dialog.getByLabel('材料费').fill('880');
  await dialog.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByRole('dialog', { name: '确认提交' })).toBeVisible();
  await expect(dialog.getByText('¥2,080.50')).toBeVisible();

  await dialog.getByRole('button', { name: '确认并创建' }).click();
  const detail = page.getByRole('dialog', { name: /工单详情/ });
  await expect(detail).toContainText('RO20260700001');
  await expect(detail).toContainText('蒙K12345');
});

test('guards incomplete steps and confirms before discarding a local draft', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '维修接待' }).click();
  await page.getByRole('button', { name: '新增工单', exact: true }).first().click();
  const dialog = page.locator('.order-wizard');

  await dialog.getByRole('button', { name: '下一步' }).click();
  await expect(dialog.getByText('请输入客户姓名')).toBeVisible();
  await dialog.getByLabel('客户姓名 *').fill('草稿客户');
  await dialog.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(dialog.getByText('草稿已加密保存在本机')).toBeVisible();
  await dialog.getByRole('button', { name: '关闭' }).click();
  const leave = page.getByRole('alertdialog', { name: '保留当前填写内容？' });
  await expect(leave).toBeVisible();
  await leave.getByRole('button', { name: '放弃草稿' }).click();
  await expect(dialog).toBeHidden();
});

test('keeps the operation in confirmation after a server failure', async ({ page }) => {
  await page.route('**/api/orders/create', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'TEMPORARY_FAILURE' }),
  }));
  await page.goto('/');
  await page.getByRole('button', { name: '维修接待' }).click();
  await page.getByRole('button', { name: '新增工单', exact: true }).first().click();
  const dialog = page.locator('.order-wizard');

  await dialog.getByLabel('客户姓名 *').fill('王先生');
  await dialog.getByLabel('手机号 *').fill('15000000000');
  await dialog.getByLabel('车牌号 *').fill('蒙K12345');
  await dialog.getByLabel('车型 *').fill('小鹏 P7+');
  await dialog.getByRole('button', { name: '下一步' }).click();
  await dialog.getByLabel('保险到期日 *').fill('2027-07-22');
  await dialog.getByRole('button', { name: '下一步' }).click();
  await dialog.getByLabel('维修项目 *').fill('维修');
  await dialog.getByRole('button', { name: '下一步' }).click();
  await dialog.getByRole('button', { name: '确认并创建' }).click();

  await expect(dialog.getByRole('button', { name: '确认提交结果' })).toBeVisible();
  await expect(dialog.getByText('提交结果正在确认，请勿重复新增')).toBeVisible();
});
