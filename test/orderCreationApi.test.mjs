import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { sha256Hex } from '../functions/_shared/auth.js';
import {
  buildOrderCreationMetadata,
  normalizeCreateOrderCommand,
} from '../functions/_shared/order-creation.js';
import { onRequestPost as createOrder } from '../functions/api/orders/create.js';
import { onRequestGet as getCreateOperation } from '../functions/api/order-operations/create-order/[operationId].js';
import { onRequestPost as legacyOrderPost } from '../functions/api/orders.js';

const contractUrl = new URL('../contracts/order-creation-v1.json', import.meta.url);

test('unified create requires authentication and enabled company capability', async () => {
  const env = environment({ session: null });
  const unauthorized = await createOrder({ request: createRequest(validPayload()), env });
  assert.equal(unauthorized.status, 401);

  const disabledEnv = environment({ capabilities: [{ capability: 'VIEW_ORDERS', enabled: 1 }] });
  const forbidden = await createOrder({ request: createRequest(validPayload()), env: disabledEnv });
  assert.equal(forbidden.status, 403);
  assert.deepEqual(await forbidden.json(), { error: 'CAPABILITY_DISABLED' });
  assert.equal(disabledEnv.state.sequenceAllocations, 0);
});

test('unified create forces server fields and completes order plus operation in one batch', async () => {
  const env = environment();
  const payload = validPayload();
  payload.order.id = 'CLIENT-ID';
  payload.order.companyId = 'other-company';
  payload.order.status = '已结算';
  payload.order.version = 99;

  const response = await createOrder({ request: createRequest(payload), env });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.match(body.order.id, /^RO\d{6}00001$/);
  assert.equal(body.order.companyId, 'tongda');
  assert.equal(body.order.status, '在修中');
  assert.equal(body.order.version, 1);
  assert.equal(body.order.laborCents, 120050);
  assert.equal(body.order.materialCents, 88000);
  assert.equal(body.order.amountCents, 208050);
  assert.equal(body.order.settlementDate, '');
  assert.equal(body.order.voided, false);
  assert.deepEqual(body.capabilities, ['VIEW_ORDERS', 'CREATE_ORDER']);
  assert.equal(env.state.sequenceAllocations, 1);
  assert.equal(env.state.batches.length, 1);
  assert.equal(env.state.batches[0].some((statement) => statement.sql.includes('INSERT INTO repair_orders')), true);
  assert.equal(env.state.batches[0].some((statement) => statement.sql.includes("state = 'completed'")), true);
  assert.equal(env.state.batches[0].some((statement) => statement.sql.includes('INSERT OR IGNORE INTO operation_logs')), true);
  assert.equal(env.state.insertedOrder.company_id, 'tongda');
  assert.notEqual(env.state.insertedOrder.id, 'CLIENT-ID');
});

test('same operation replays one result while mismatched content is rejected', async () => {
  const env = environment();
  const payload = validPayload();
  const first = await createOrder({ request: createRequest(payload), env });
  const firstBody = await first.json();
  const replay = await createOrder({ request: createRequest(payload), env });

  assert.equal(replay.status, 201);
  assert.deepEqual(await replay.json(), firstBody);
  assert.equal(env.state.sequenceAllocations, 1);
  assert.equal(env.state.batches.length, 1);

  const changed = structuredClone(payload);
  changed.order.customer = '另一位客户';
  const conflict = await createOrder({ request: createRequest(changed), env });
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { error: 'OPERATION_ID_REUSED' });
});

test('active matching lease reports in-progress without allocating a number', async () => {
  const payload = validPayload();
  const normalized = normalizeCreateOrderCommand(payload.order, metadata()).value;
  const requestHash = await sha256Hex(JSON.stringify(normalized));
  const env = environment({
    operation: {
      state: 'started', http_status: 0, response_json: '', request_hash: requestHash,
      target_id: '', lease_token: 'other-worker', lease_until: '2999-01-01 00:00:00',
    },
  });

  const response = await createOrder({ request: createRequest(payload), env });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: 'OPERATION_IN_PROGRESS' });
  assert.equal(env.state.sequenceAllocations, 0);
});

test('expired matching lease is reclaimed and reuses its reserved target id', async () => {
  const payload = validPayload();
  const normalized = normalizeCreateOrderCommand(payload.order, metadata()).value;
  const requestHash = await sha256Hex(JSON.stringify(normalized));
  const env = environment({
    operation: {
      state: 'started', http_status: 0, response_json: '', request_hash: requestHash,
      target_id: 'RO20260700042', lease_token: 'expired-worker', lease_until: '2000-01-01 00:00:00',
    },
  });

  const response = await createOrder({ request: createRequest(payload), env });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.order.id, 'RO20260700042');
  assert.equal(env.state.sequenceAllocations, 0);
  assert.equal(env.state.batches.length, 1);
});

test('unified create returns stable field errors before starting an operation', async () => {
  const payload = validPayload();
  payload.order.customer = ' ';
  payload.order.insuranceExpiry = '2027-02-30';
  payload.order.laborCents = -1;
  const env = environment();

  const response = await createOrder({ request: createRequest(payload), env });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error, 'VALIDATION_FAILED');
  assert.equal(body.fieldErrors.customer, 'order.customer.required');
  assert.equal(body.fieldErrors.insuranceExpiry, 'order.insuranceExpiry.invalid_date');
  assert.equal(body.fieldErrors.laborCents, 'order.laborCents.non_negative_integer');
  assert.equal(env.state.operation, null);
});

test('operation query is actor scoped and returns the completed server result', async () => {
  const env = environment();
  const payload = validPayload();
  const created = await createOrder({ request: createRequest(payload), env });
  const createdBody = await created.json();
  const response = await getCreateOperation({
    request: authenticatedRequest(`/api/order-operations/create-order/${payload.operationId}`),
    env,
    params: { operationId: payload.operationId },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.state, 'completed');
  assert.deepEqual(body.order, createdBody.order);
  const operationQuery = env.calls.filter((call) => call.sql.includes('FROM order_operations')).at(-1);
  assert.deepEqual(operationQuery.values.slice(0, 3), ['tongda', 'worker', 'create_order']);
});

test('legacy missing-target create maps eventId and ignores its client order id', async () => {
  const env = environment();
  const fixture = await validFixture();
  const legacyOrder = {
    ...fixture.input,
    id: 'RO202607CLIENT',
    companyId: 'other-company',
    date: '2026-01-01',
    time: '00:00',
    status: '已结算',
    labor: fixture.input.laborCents / 100,
    material: fixture.input.materialCents / 100,
  };
  delete legacyOrder.laborCents;
  delete legacyOrder.materialCents;

  const response = await legacyOrderPost({
    request: new Request('https://example.test/api/orders', {
      method: 'POST',
      headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
      body: JSON.stringify({ order: legacyOrder, eventId: fixture.operationId }),
    }),
    env,
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.match(body.order.id, /^RO\d{6}00001$/);
  assert.notEqual(body.order.id, legacyOrder.id);
  assert.equal(body.order.status, '在修中');
});

function createRequest(payload) {
  return new Request('https://example.test/api/orders/create', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function authenticatedRequest(path) {
  return new Request(`https://example.test${path}`, {
    headers: { authorization: 'Bearer test-token' },
  });
}

let fixtureCache;
async function validFixture() {
  if (!fixtureCache) {
    const contract = JSON.parse(await readFile(contractUrl, 'utf8'));
    fixtureCache = contract.validCases[0];
  }
  return structuredClone(fixtureCache);
}

function validPayload() {
  return {
    operationId: '11111111-1111-4111-8111-111111111111',
    order: {
      customer: '王先生', phone: '15000000000', plate: '蒙K12345', car: '小鹏 P7+',
      vin: 'LXP00000000000001', staff: '张工', insuranceExpiry: '2027-07-21',
      insurer: '人保财险', type: '标的车', accidentType: '钣喷维修（有换件）',
      claimNo: 'BA20260721001', record: '前保险杠修复并喷漆', laborCents: 120050,
      materialCents: 88000, delivery: '明日交车', remark: '交车前联系客户',
    },
  };
}

function metadata() {
  return buildOrderCreationMetadata(dictionaryRows());
}

function dictionaryRows() {
  return [
    { id: 'i-1', category: 'insurer', value: '人保财险', extra: '', sort_order: 10 },
    { id: 's-1', category: 'staff', value: '接待顾问', extra: '张工', sort_order: 10 },
  ];
}

function environment({
  session = {
    token: 'test-token', role: 'staff', label: '员工', company_id: 'tongda',
    username: 'worker', display_name: '员工', permissions: '["repair","history"]',
  },
  capabilities = [
    { capability: 'VIEW_ORDERS', enabled: 1 },
    { capability: 'CREATE_ORDER', enabled: 1 },
  ],
  operation = null,
} = {}) {
  const calls = [];
  const state = {
    operation: operation ? { ...operation } : null,
    sequenceAllocations: 0,
    batches: [],
    insertedOrder: null,
  };
  const DB = {
    prepare(sql) {
      return statement(sql, []);
    },
    async batch(statements) {
      state.batches.push(statements);
      for (const item of statements) {
        if (item.sql.includes('INSERT INTO repair_orders')) {
          state.insertedOrder = insertedOrderFrom(item.values);
        }
        if (item.sql.includes("state = 'completed'")) {
          state.operation.state = 'completed';
          state.operation.http_status = item.values[0];
          state.operation.response_json = item.values[1];
          state.operation.lease_token = '';
          state.operation.lease_until = '';
        }
      }
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };

  function statement(sql, values) {
    return {
      sql,
      values,
      bind(...nextValues) {
        calls.push({ sql, values: nextValues });
        return statement(sql, nextValues);
      },
      async first() {
        if (sql.includes('FROM access_sessions')) return session;
        if (sql.includes('FROM order_operations')) return state.operation ? { ...state.operation } : null;
        if (sql.includes('INSERT INTO order_number_sequences')) {
          state.sequenceAllocations += 1;
          return { sequence_value: state.sequenceAllocations };
        }
        if (sql.includes('SELECT * FROM repair_orders')) return null;
        throw new Error(`Unexpected first SQL: ${sql}`);
      },
      async all() {
        if (sql.includes('FROM company_capabilities')) return { results: capabilities };
        if (sql.includes('FROM system_dictionaries')) return { results: dictionaryRows() };
        throw new Error(`Unexpected all SQL: ${sql}`);
      },
      async run() {
        if (sql.includes('INSERT OR IGNORE INTO order_operations')) {
          if (state.operation) return { meta: { changes: 0 } };
          state.operation = {
            state: 'started', http_status: 0, response_json: '', target_id: values[4],
            request_hash: values[5], lease_token: values[6], lease_until: '2999-01-01 00:00:00',
          };
          return { meta: { changes: 1 } };
        }
        if (sql.includes('SET target_id =')) {
          state.operation.target_id = values[0];
          return { meta: { changes: 1 } };
        }
        if (sql.includes('lease_token = ?') && sql.includes("state IN ('started', 'failed')")) {
          state.operation.lease_token = values[0];
          state.operation.lease_until = '2999-01-01 00:00:00';
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unexpected run SQL: ${sql}`);
      },
    };
  }

  return { DB, calls, state };
}

function insertedOrderFrom(values) {
  const columns = [
    'id', 'company_id', 'date', 'time', 'plate', 'customer', 'phone', 'car', 'insurer',
    'insurance_expiry', 'type', 'status', 'labor', 'material', 'amount', 'record', 'staff',
    'delivery', 'vin', 'claim_no', 'accident_type', 'payment_method', 'remark',
  ];
  return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
}
