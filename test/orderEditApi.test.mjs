import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { sha256Hex } from '../functions/_shared/auth.js';
import { buildOrderCreationMetadata } from '../functions/_shared/order-creation.js';
import { normalizeEditOrderCommand } from '../functions/_shared/order-edit.js';
import { onRequestPatch as patchOrder } from '../functions/api/orders/[id]/index.js';
import { onRequestGet as getEditOperation } from '../functions/api/order-operations/edit-order/[operationId].js';

const contract = JSON.parse(await readFile(
  new URL('../contracts/order-edit-v1.json', import.meta.url),
  'utf8',
));
const operationId = '22222222-2222-4222-8222-222222222222';

test('PATCH requires authentication and hides cross-company or voided targets', async () => {
  const unauthorized = await patchOrder({
    request: request(validPayload(), false), env: environment({ session: null }), params: { id: 'RO-1' },
  });
  assert.equal(unauthorized.status, 401);

  for (const row of [null, databaseRow({ company_id: 'other-company' }), databaseRow({ voided: 1 })]) {
    const response = await patchOrder({
      request: request(validPayload()), env: environment({ row }), params: { id: 'RO-1' },
    });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'ORDER_NOT_FOUND' });
  }
});

test('PATCH independently enforces capability, repair permission, and editable status', async () => {
  const disabled = await patchOrder({
    request: request(validPayload()),
    env: environment({ capabilities: [{ capability: 'VIEW_ORDERS', enabled: 1 }] }),
    params: { id: 'RO-1' },
  });
  assert.equal(disabled.status, 403);
  assert.deepEqual(await disabled.json(), { error: 'CAPABILITY_DISABLED' });

  const noRepair = await patchOrder({
    request: request(validPayload()),
    env: environment({ session: staffSession('["history"]') }),
    params: { id: 'RO-1' },
  });
  assert.equal(noRepair.status, 403);
  assert.deepEqual(await noRepair.json(), { error: 'PERMISSION_REQUIRED' });

  const settledEnv = environment({ row: databaseRow({ status: '已结算' }) });
  const settled = await patchOrder({
    request: request(validPayload()), env: settledEnv, params: { id: 'RO-1' },
  });
  assert.equal(settled.status, 409);
  const body = await settled.json();
  assert.equal(body.error, 'ORDER_NOT_EDITABLE');
  assert.equal(body.order.status, '已结算');
  assert.equal(settledEnv.state.operation, null);
});

test('PATCH validates operation, version, and the canonical full snapshot before claiming', async () => {
  for (const [mutate, expectedError] of [
    [(payload) => { payload.operationId = 'not-a-uuid'; }, 'OPERATION_ID_REQUIRED'],
    [(payload) => { payload.expectedVersion = 0; }, 'EXPECTED_VERSION_REQUIRED'],
    [(payload) => { payload.order.customer = ' '; }, 'VALIDATION_FAILED'],
  ]) {
    const payload = validPayload();
    mutate(payload);
    const env = environment();
    const response = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error, expectedError);
    assert.equal(env.state.operation, null);
  }
});

test('PATCH atomically writes one audit sentinel, one versioned update, and operation completion', async () => {
  const payload = validPayload();
  payload.order.phone = '13911112222';
  payload.order.vin = 'LHG99999999999999';
  const env = environment({ submitted: payload.order });

  const response = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.order.version, payload.expectedVersion + 1);
  assert.equal(body.order.customer, '张先生');
  assert.equal(body.order.status, '在修中');
  assert.deepEqual(env.state.batchKinds, ['audit-sentinel', 'order-update', 'operation-complete']);
  assert.equal(env.state.row.version, payload.expectedVersion + 1);
  assert.equal(env.state.auditRows.filter((row) => row.event_id === operationId).length, 1);

  const audit = env.calls.find((call) => call.sql.includes('-- audit-sentinel'));
  const auditText = audit.values.map(String).join('|');
  assert.doesNotMatch(auditText, /13911112222|LHG99999999999999/u);
  assert.match(auditText, /\[REDACTED\]/u);

  const update = env.calls.find((call) => call.sql.includes('-- order-update'));
  assert.match(update.sql, /company_id = \?/u);
  assert.match(update.sql, /id = \?/u);
  assert.match(update.sql, /version = \?/u);
  assert.match(update.sql, /voided = 0/u);
  assert.match(update.sql, /status IN \('在修中', '已完工', '待结算'\)/u);
});

test('a missed version precondition stores and deterministically replays a terminal 409', async () => {
  const payload = validPayload();
  const env = environment({ submitted: payload.order, batchConflict: true });

  const conflict = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });
  const conflictBody = await conflict.json();
  assert.equal(conflict.status, 409);
  assert.equal(conflictBody.error, 'ORDER_VERSION_CONFLICT');
  assert.equal(conflictBody.order.version, payload.expectedVersion + 1);
  assert.deepEqual(conflictBody.conflictingFields, ['record', 'laborCents']);
  assert.equal(env.state.auditRows.length, 0);
  assert.equal(env.state.operation.state, 'completed');
  assert.equal(env.state.operation.http_status, 409);

  const replay = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });
  assert.equal(replay.status, 409);
  assert.deepEqual(await replay.json(), conflictBody);
  assert.equal(env.state.batches, 1);
});

test('same operation hash replays once while hash reuse and an active lease are rejected', async () => {
  const payload = validPayload();
  const replayEnv = environment({ submitted: payload.order });
  const first = await patchOrder({ request: request(payload), env: replayEnv, params: { id: 'RO-1' } });
  const firstBody = await first.json();
  const replay = await patchOrder({ request: request(payload), env: replayEnv, params: { id: 'RO-1' } });
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), firstBody);
  assert.equal(replayEnv.state.batches, 1);
  assert.equal(replayEnv.state.auditRows.length, 1);

  const changed = validPayload();
  changed.order.customer = '另一位客户';
  const reuse = await patchOrder({ request: request(changed), env: replayEnv, params: { id: 'RO-1' } });
  assert.equal(reuse.status, 409);
  assert.deepEqual(await reuse.json(), { error: 'OPERATION_ID_REUSED' });

  const activeEnv = await leasedEnvironment(payload, '2999-01-01 00:00:00');
  const active = await patchOrder({ request: request(payload), env: activeEnv, params: { id: 'RO-1' } });
  assert.equal(active.status, 409);
  assert.deepEqual(await active.json(), { error: 'OPERATION_IN_PROGRESS' });
  assert.equal(activeEnv.state.batches, 0);
});

test('an expired matching lease is reclaimed and the operation query is actor isolated', async () => {
  const payload = validPayload();
  const env = await leasedEnvironment(payload, '2000-01-01 00:00:00');
  env.state.submitted = payload.order;
  const response = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });
  assert.equal(response.status, 200);
  assert.equal(env.state.batches, 1);

  const query = await getEditOperation({
    request: queryRequest(), env, params: { operationId },
  });
  assert.equal(query.status, 200);
  const queryBody = await query.json();
  const responseBody = await response.clone().json();
  assert.equal(queryBody.state, 'completed');
  assert.deepEqual(queryBody.order, responseBody.order);
  assert.deepEqual(queryBody.operation, responseBody.operation);

  const isolated = environment({
    session: { ...staffSession(), username: 'other-worker' },
    operations: env.state.operations,
  });
  const missing = await getEditOperation({
    request: queryRequest(), env: isolated, params: { operationId },
  });
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'OPERATION_NOT_FOUND' });
});

async function leasedEnvironment(payload, leaseUntil) {
  const normalized = normalizeEditOrderCommand(payload.order, metadata()).value;
  const hash = await sha256Hex(JSON.stringify({
    orderId: 'RO-1', expectedVersion: payload.expectedVersion, order: normalized,
  }));
  return environment({
    operation: {
      state: 'started', http_status: 0, response_json: '', request_hash: hash,
      target_id: 'RO-1', lease_token: 'other-worker', lease_until: leaseUntil,
    },
  });
}

function request(payload, authenticated = true) {
  return new Request('https://example.test/api/orders/RO-1', {
    method: 'PATCH',
    headers: {
      ...(authenticated ? { authorization: 'Bearer test-token' } : {}),
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

function queryRequest() {
  return new Request(`https://example.test/api/order-operations/edit-order/${operationId}`, {
    headers: { authorization: 'Bearer test-token' },
  });
}

function validPayload() {
  return {
    operationId,
    expectedVersion: 4,
    order: structuredClone(contract.validCases[0].input),
  };
}

function staffSession(permissions = '["repair","history"]') {
  return {
    token: 'test-token', role: 'staff', label: '员工', company_id: 'tongda',
    username: 'worker', display_name: '员工', permissions,
  };
}

function environment({
  session = staffSession(),
  row = databaseRow(),
  capabilities = [
    { capability: 'VIEW_ORDERS', enabled: 1 },
    { capability: 'EDIT_ORDER', enabled: 1 },
  ],
  operation = null,
  operations: suppliedOperations = null,
  submitted = contract.validCases[0].input,
  batchConflict = false,
} = {}) {
  const calls = [];
  const operations = suppliedOperations || new Map();
  const state = {
    row: row ? { ...row } : null,
    submitted,
    operation: operation ? { ...operation } : null,
    operations,
    auditRows: [],
    batchKinds: [],
    batches: 0,
    batchConflict,
  };
  if (state.operation) operations.set(operationKey(session, operationId), state.operation);

  const DB = {
    prepare(sql) { return statement(sql, []); },
    async batch(statements) {
      state.batches += 1;
      state.batchKinds = statements.map((item) => batchKind(item.sql));
      if (state.batchConflict) {
        state.row = databaseRow({
          version: 5,
          record: contract.conflictCases[0].serverOrder.record,
          labor: contract.conflictCases[0].serverOrder.laborCents / 100,
        });
        return statements.map(() => ({ success: true, meta: { changes: 0 } }));
      }
      const operationRow = operations.get(operationKey(session, operationId));
      state.auditRows.push({ event_id: operationId, action: 'update_order' });
      state.row = editedDatabaseRow(state.row, state.submitted);
      operationRow.state = 'completed';
      operationRow.http_status = statements[2].values[0];
      operationRow.response_json = statements[2].values[1];
      operationRow.lease_token = '';
      operationRow.lease_until = '';
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
        if (sql.includes('FROM order_operations')) {
          return operations.get(values.join('|')) || null;
        }
        if (sql.includes('FROM repair_orders')) {
          const [id, companyId] = values;
          return state.row && state.row.id === id && state.row.company_id === companyId
            && (!sql.includes('voided = 0') || state.row.voided === 0)
            ? { ...state.row }
            : null;
        }
        throw new Error(`Unexpected first SQL: ${sql}`);
      },
      async all() {
        if (sql.includes('FROM company_capabilities')) return { results: capabilities };
        if (sql.includes('FROM system_dictionaries')) return { results: dictionaryRows() };
        throw new Error(`Unexpected all SQL: ${sql}`);
      },
      async run() {
        if (sql.includes('INSERT OR IGNORE INTO order_operations')) {
          const key = values.slice(0, 4).join('|');
          if (operations.has(key)) return { meta: { changes: 0 } };
          const next = {
            state: 'started', http_status: 0, response_json: '', target_id: values[4],
            request_hash: values[5], lease_token: values[6], lease_until: '2999-01-01 00:00:00',
          };
          operations.set(key, next);
          state.operation = next;
          return { meta: { changes: 1 } };
        }
        if (sql.includes("state IN ('started', 'failed')")) {
          const key = values.slice(1, 5).join('|');
          const current = operations.get(key);
          current.lease_token = values[0];
          current.lease_until = '2999-01-01 00:00:00';
          state.operation = current;
          return { meta: { changes: 1 } };
        }
        if (sql.includes("SET state = 'completed'")) {
          const key = values.slice(2, 6).join('|');
          const current = operations.get(key);
          if (!current || current.lease_token !== values[6]) return { meta: { changes: 0 } };
          current.state = 'completed';
          current.http_status = values[0];
          current.response_json = values[1];
          current.lease_token = '';
          current.lease_until = '';
          state.operation = current;
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unexpected run SQL: ${sql}`);
      },
    };
  }

  return { DB, calls, state };
}

function batchKind(sql) {
  if (sql.includes('-- audit-sentinel')) return 'audit-sentinel';
  if (sql.includes('-- order-update')) return 'order-update';
  if (sql.includes('-- operation-complete')) return 'operation-complete';
  return 'unknown';
}

function operationKey(session, id) {
  return [session?.company_id || 'tongda', session?.username || session?.label || '', 'edit_order', id].join('|');
}

function metadata() {
  return buildOrderCreationMetadata(dictionaryRows());
}

function dictionaryRows() {
  return [
    { id: 'i-1', category: 'insurer', value: '人保财险', extra: '', sort_order: 10 },
    { id: 'i-2', category: 'insurer', value: '平安财险', extra: '', sort_order: 20 },
    { id: 'i-3', category: 'insurer', value: '太平洋财险', extra: '', sort_order: 30 },
    { id: 's-1', category: 'staff', value: '接待顾问', extra: '王师傅', sort_order: 10 },
  ];
}

function editedDatabaseRow(existing, submitted) {
  return {
    ...existing,
    customer: String(submitted.customer).trim(), phone: String(submitted.phone).trim(),
    plate: String(submitted.plate).trim(), car: String(submitted.car).trim(),
    vin: String(submitted.vin).trim(), staff: String(submitted.staff).trim(),
    insurance_expiry: submitted.insuranceExpiry, insurer: submitted.insurer,
    type: submitted.type, accident_type: submitted.accidentType,
    claim_no: String(submitted.claimNo).trim(), record: String(submitted.record).trim(),
    labor: submitted.laborCents / 100, material: submitted.materialCents / 100,
    amount: (submitted.laborCents + submitted.materialCents) / 100,
    delivery: submitted.delivery, remark: String(submitted.remark).trim(),
    version: existing.version + 1, updated_at: '2026-07-22 12:00:00',
  };
}

function databaseRow(overrides = {}) {
  const server = contract.conflictCases[0].serverOrder;
  return {
    id: 'RO-1', company_id: 'tongda', version: 4,
    date: '2026-07-20', time: '09:30', plate: server.plate, customer: server.customer,
    phone: server.phone, car: server.car, insurer: server.insurer,
    insurance_expiry: server.insuranceExpiry, type: server.type, status: '在修中',
    labor: server.laborCents / 100, material: server.materialCents / 100,
    amount: (server.laborCents + server.materialCents) / 100, record: server.record,
    staff: server.staff, delivery: server.delivery, vin: server.vin,
    claim_no: server.claimNo, accident_type: server.accidentType,
    payment_method: '待确认', remark: server.remark,
    settlement_date: '', settlement_time: '', settlement_remark: '',
    settlement_receipt_key: '', settlement_receipt_name: '', settlement_receipt_type: '',
    settlement_receipt_size: 0, settlement_receipt_uploaded_at: '',
    voided: 0, voided_at: '', void_reason: '', created_at: '2026-07-20 09:30:00',
    updated_at: '2026-07-20 10:00:00',
    ...overrides,
  };
}
