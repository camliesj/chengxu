import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { decodeOrderCursor } from '../functions/_shared/order-foundation.js';
import { onRequestGet as getOrders } from '../functions/api/orders.js';
import { onRequestGet as getOrderDetail } from '../functions/api/orders/[id]/index.js';

test('legacy orders read keeps orders and adds role-filtered capabilities without session secrets', async () => {
  const env = environment({
    orders: [row()],
    capabilities: [
      { capability: 'VIEW_ORDERS', enabled: 1 },
      { capability: 'EDIT_ORDER', enabled: 1 },
      { capability: 'SETTLE_ORDER', enabled: 1 },
    ],
  });
  const response = await getOrders({ request: request('/api/orders'), env });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(payload), ['orders', 'capabilities', 'serverTime']);
  assert.deepEqual(payload.capabilities, ['VIEW_ORDERS', 'EDIT_ORDER']);
  assert.match(payload.serverTime, /^\d{4}-\d{2}-\d{2}T/u);
  assert.equal(JSON.stringify(payload).includes('test-token'), false);
  assert.equal(JSON.stringify(payload).includes('worker'), false);
  assert.equal(payload.orders[0].settlementReceiptKey, 'receipts/tongda/private.png');
  const query = env.calls.find((call) => call.sql.includes('SELECT * FROM repair_orders'));
  assert.match(query.sql, /voided = 0 AND company_id = \? ORDER BY date DESC, time DESC, created_at DESC/);
  assert.deepEqual(query.values, ['tongda']);
});

test('web client stores legacy orders and capabilities separately and capability-gates order writes', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(appSource, /return \{\s*orders: Array\.isArray\(data\.orders\)[\s\S]*capabilities: Array\.isArray\(data\.capabilities\)[\s\S]*serverTime:/u);
  assert.match(appSource, /useReducer\(\s*orderCapabilityReducer/u);
  assert.match(appSource, /setOrders\(cloudEnvelope\.orders\)/u);
  assert.match(appSource, /type: 'requestSucceeded'[\s\S]{0,160}capabilities: cloudEnvelope\.capabilities/u);
  assert.match(appSource, /isCurrentOrderCapabilityRequest\(requestScope\)/u);
  assert.doesNotMatch(appSource, /const canSettleOrder = isAdmin;/u);
  for (const capability of ['CREATE_ORDER', 'EDIT_ORDER', 'ADVANCE_ORDER_STATUS', 'SETTLE_ORDER', 'VOID_ORDER', 'MAINTAIN_RECEIPT']) {
    assert.match(appSource, new RegExp(`hasOrderCapability\\(orderCapabilityState, '${capability}'\\)`), capability);
  }
});

test('current full page is scoped paginated and hides receipt object keys', async () => {
  const env = environment({
    orders: [
      row({ id: 'RO-3', updated_at: '2026-07-20 10:03:00' }),
      row({ id: 'RO-2', updated_at: '2026-07-20 10:02:00' }),
      row({ id: 'RO-1', updated_at: '2026-07-20 10:01:00' }),
    ],
    capabilities: [{ capability: 'VIEW_ORDERS', enabled: 1 }],
  });
  const response = await getOrders({ request: request('/api/orders?scope=current&limit=2'), env });
  const payload = await response.json();

  assert.deepEqual(payload.orders.map((order) => order.id), ['RO-3', 'RO-2']);
  assert.deepEqual(payload.removedOrderIds, []);
  assert.equal('settlementReceiptKey' in payload.orders[0], false);
  assert.deepEqual(payload.orders[0].receipt, {
    name: 'receipt.png', contentType: 'image/png', sizeBytes: 128, uploadedAt: '2026-07-20 10:00:00',
  });
  assert.deepEqual(decodeOrderCursor(payload.nextCursor), {
    mode: 'full', scope: 'current', updatedAt: '2026-07-20 10:02:00', id: 'RO-2',
  });
  const query = scopedOrderQuery(env);
  assert.match(query.sql, /status IN \(\?, \?, \?\)/);
  assert.match(query.sql, /updated_at DESC, id DESC/);
  assert.deepEqual(query.values, ['tongda', '在修中', '已完工', '待结算', 3]);
});

test('history full page selects settled rows only', async () => {
  const env = environment({ orders: [row({ status: '已结算' })] });
  const response = await getOrders({ request: request('/api/orders?scope=history'), env });

  assert.equal(response.status, 200);
  const query = scopedOrderQuery(env);
  assert.match(query.sql, /status = \?/);
  assert.deepEqual(query.values, ['tongda', '已结算', 51]);
});

test('delta page returns matching rows and tombstones for rows that left current scope', async () => {
  const env = environment({
    orders: [
      row({ id: 'RO-CURRENT', status: '已完工', updated_at: '2026-07-20 10:01:00' }),
      row({ id: 'RO-SETTLED', status: '已结算', updated_at: '2026-07-20 10:02:00' }),
      row({ id: 'RO-VOID', voided: 1, updated_at: '2026-07-20 10:03:00' }),
    ],
  });
  const response = await getOrders({
    request: request('/api/orders?scope=current&updatedAfter=2026-07-20T09%3A00%3A00Z&limit=10'),
    env,
  });
  const payload = await response.json();

  assert.deepEqual(payload.orders.map((order) => order.id), ['RO-CURRENT']);
  assert.deepEqual(payload.removedOrderIds, ['RO-SETTLED', 'RO-VOID']);
  assert.equal(payload.nextCursor, null);
  const query = scopedOrderQuery(env);
  assert.doesNotMatch(query.sql, /status IN|status =/);
  assert.match(query.sql, /updated_at > \?/);
  assert.match(query.sql, /updated_at ASC, id ASC/);
  assert.deepEqual(query.values, ['tongda', '2026-07-20 09:00:00', 11]);
});

test('delta cursor continues ascending and preserves delta mode', async () => {
  const cursor = Buffer.from(JSON.stringify({
    mode: 'delta', scope: 'current', updatedAt: '2026-07-20 10:00:00', id: 'RO-0',
  }), 'utf8').toString('base64url');
  const env = environment({
    orders: [
      row({ id: 'RO-1', updated_at: '2026-07-20 10:01:00' }),
      row({ id: 'RO-2', updated_at: '2026-07-20 10:02:00' }),
    ],
  });
  const response = await getOrders({
    request: request(`/api/orders?scope=current&cursor=${encodeURIComponent(cursor)}&limit=1`),
    env,
  });
  const payload = await response.json();

  assert.deepEqual(payload.orders.map((order) => order.id), ['RO-1']);
  assert.deepEqual(decodeOrderCursor(payload.nextCursor), {
    mode: 'delta', scope: 'current', updatedAt: '2026-07-20 10:01:00', id: 'RO-1',
  });
  const query = scopedOrderQuery(env);
  assert.match(query.sql, /updated_at > \? OR \(updated_at = \? AND id > \?\)/);
  assert.deepEqual(query.values, ['tongda', '2026-07-20 10:00:00', '2026-07-20 10:00:00', 'RO-0', 2]);
});

test('invalid pagination inputs are rejected before querying orders', async () => {
  const currentCursor = Buffer.from(JSON.stringify({
    mode: 'full', scope: 'current', updatedAt: '2026-07-20 10:00:00', id: 'RO-1',
  }), 'utf8').toString('base64url');
  for (const path of [
    '/api/orders?scope=other',
    '/api/orders?scope=current&updatedAfter=bad-date',
    '/api/orders?scope=current&updatedAfter=2026-07-20T09%3A00%3A00Z&cursor=value',
    '/api/orders?scope=current&cursor=bad-cursor',
    `/api/orders?scope=history&cursor=${encodeURIComponent(currentCursor)}`,
  ]) {
    const env = environment();
    const response = await getOrders({ request: request(path), env });
    assert.equal(response.status, 400, path);
    assert.equal(env.calls.some((call) => call.sql.includes('SELECT * FROM repair_orders')), false);
  }
});

test('detail read is company scoped and returns safe full fields', async () => {
  const env = environment({ detail: row({ id: 'RO/100', phone: '15000000000', vin: 'VIN-001' }) });
  const response = await getOrderDetail({
    request: request('/api/orders/RO%2F100'), env, params: { id: 'RO/100' },
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.order.phone, '15000000000');
  assert.equal(payload.order.vin, 'VIN-001');
  assert.equal('settlementReceiptKey' in payload.order, false);
  const query = env.calls.find((call) => call.sql.includes('WHERE id = ? AND company_id = ?'));
  assert.deepEqual(query.values, ['RO/100', 'tongda']);
});

test('detail read returns 404 without leaking another company row', async () => {
  const env = environment({ detail: null });
  const response = await getOrderDetail({
    request: request('/api/orders/RO-404'), env, params: { id: 'RO-404' },
  });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'ORDER_NOT_FOUND' });
});

function request(path) {
  return new Request(`https://example.test${path}`, {
    headers: { authorization: 'Bearer test-token' },
  });
}

function environment({ orders = [], detail = undefined, capabilities = [] } = {}) {
  const calls = [];
  const session = {
    token: 'test-token', role: 'staff', label: '员工', company_id: 'tongda',
    username: 'worker', display_name: '员工', permissions: '["repair","history"]',
  };
  return {
    calls,
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            calls.push({ sql, values });
            if (sql.includes('FROM access_sessions')) return { first: async () => session };
            if (sql.includes('FROM company_capabilities')) {
              return { all: async () => ({ results: capabilities }) };
            }
            if (sql.includes('WHERE id = ? AND company_id = ?')) {
              return { first: async () => detail ?? null };
            }
            if (sql.includes('SELECT * FROM repair_orders')) {
              return { all: async () => ({ results: orders }) };
            }
            throw new Error(`Unexpected SQL: ${sql}`);
          },
        };
      },
    },
  };
}

function scopedOrderQuery(env) {
  return env.calls.find((call) => call.sql.includes('SELECT * FROM repair_orders') && call.sql.includes('updated_at'));
}

function row(overrides = {}) {
  return {
    id: 'RO-1', company_id: 'tongda', version: 2,
    date: '2026-07-20', time: '09:30', plate: '蒙K·A3816', customer: '张先生',
    phone: '15000000000', car: '大众帕萨特', insurer: '人保财险', insurance_expiry: '2026-08-01',
    type: '常规保养', status: '在修中', labor: 100, material: 200, amount: 300,
    record: '更换机油与滤芯', staff: '张工', delivery: '2026-07-20 18:00', vin: 'VIN-001',
    claim_no: '', accident_type: '常规维修', payment_method: '待确认', remark: '',
    settlement_date: '', settlement_time: '', settlement_remark: '',
    settlement_receipt_key: 'receipts/tongda/private.png',
    settlement_receipt_name: 'receipt.png', settlement_receipt_type: 'image/png',
    settlement_receipt_size: 128, settlement_receipt_uploaded_at: '2026-07-20 10:00:00',
    voided: 0, voided_at: '', void_reason: '', created_at: '2026-07-20 09:30:00',
    updated_at: '2026-07-20 10:00:00',
    ...overrides,
  };
}
