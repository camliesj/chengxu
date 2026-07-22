import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { sha256Hex } from '../functions/_shared/auth.js';
import { buildOrderCreationMetadata } from '../functions/_shared/order-creation.js';
import { normalizeEditOrderCommand } from '../functions/_shared/order-edit.js';
import { onRequestPatch as patchOrder } from '../functions/api/orders/[id]/index.js';
import { onRequestGet as getEditOperation } from '../functions/api/order-operations/edit-order/[operationId].js';
import * as legacyOrdersApi from '../functions/api/orders.js';

const contract = JSON.parse(await readFile(
  new URL('../contracts/order-edit-v1.json', import.meta.url),
  'utf8',
));
const operationId = '22222222-2222-4222-8222-222222222222';

test('legacy ordinary edits adapt event/version and route through the shared edit command', async () => {
  assert.equal(typeof legacyOrdersApi.legacyEditOrderInput, 'function');
  assert.equal(typeof legacyOrdersApi.routeLegacyExistingOrder, 'function');
  const existing = databaseRow();
  const payload = {
    eventId: operationId,
    order: { ...legacyOrder(existing), version: existing.version, customer: '李先生', labor: 321.45, material: 67.89 },
  };
  const editServiceCalls = [];
  let legacyUpsertCalls = 0;
  const result = await legacyOrdersApi.routeLegacyExistingOrder({
    env: {}, session: staffSession(), payload, existing,
    editOrderCommand: async (input) => {
      editServiceCalls.push(input);
      return new Response(JSON.stringify({ order: payload.order }), { status: 200 });
    },
    legacyUpsert: async () => { legacyUpsertCalls += 1; return new Response(null, { status: 204 }); },
  });

  assert.equal(result.status, 200);
  assert.equal(editServiceCalls.length, 1);
  assert.equal(editServiceCalls[0].orderId, existing.id);
  assert.equal(editServiceCalls[0].payload.operationId, payload.eventId);
  assert.equal(editServiceCalls[0].payload.expectedVersion, payload.order.version);
  assert.deepEqual(editServiceCalls[0].payload.order, {
    customer: '李先生', phone: existing.phone, plate: existing.plate, car: existing.car,
    vin: existing.vin, staff: existing.staff, insuranceExpiry: existing.insurance_expiry,
    insurer: existing.insurer, type: existing.type, accidentType: existing.accident_type,
    claimNo: existing.claim_no, record: existing.record, laborCents: 32145,
    materialCents: 6789, delivery: existing.delivery, remark: existing.remark,
  });
  assert.equal(legacyUpsertCalls, 0);
});

test('legacy status, settlement, reverse settlement, receipt, and archive edits retain legacy handling', async () => {
  const ordinary = databaseRow();
  const settled = databaseRow({ status: '已结算' });
  const cases = [
    { existing: ordinary, payload: { eventId: operationId, order: { ...legacyOrder(ordinary), status: '已完工' } } },
    { existing: ordinary, payload: { eventId: operationId, order: { ...legacyOrder(ordinary), status: '已结算', settlementDate: '2026-07-22' } } },
    { existing: settled, payload: { eventId: operationId, order: { ...legacyOrder(settled), status: '待结算' } } },
    { existing: settled, payload: { eventId: operationId, order: { ...legacyOrder(settled), settlementReceiptKey: 'receipts/tongda/new.png' } } },
    { existing: settled, payload: { mode: 'archive_edit', eventId: operationId, order: legacyOrder(settled) } },
  ];

  for (const item of cases) {
    let editCalls = 0;
    let legacyCalls = 0;
    const response = await legacyOrdersApi.routeLegacyExistingOrder({
      env: {}, session: { ...staffSession(), role: 'admin' }, ...item,
      editOrderCommand: async () => { editCalls += 1; return new Response(null); },
      legacyUpsert: async () => { legacyCalls += 1; return new Response(null, { status: 202 }); },
    });
    assert.equal(response.status, 202);
    assert.equal(editCalls, 0);
    assert.equal(legacyCalls, 1);
  }
});

test('legacy ordinary edit classification compares normalized legacy-only defaults', async () => {
  const existing = databaseRow({ payment_method: '', settlement_receipt_size: null });
  let editCalls = 0;
  let legacyCalls = 0;
  await legacyOrdersApi.routeLegacyExistingOrder({
    env: {}, session: staffSession(), existing,
    payload: { eventId: operationId, order: legacyOrder(existing) },
    editOrderCommand: async () => { editCalls += 1; return new Response(null); },
    legacyUpsert: async () => { legacyCalls += 1; return new Response(null); },
  });
  assert.equal(editCalls, 1);
  assert.equal(legacyCalls, 0);
});

test('legacy GET version flows unchanged into a real ordinary POST edit command', async () => {
  const env = environment();
  const getResponse = await legacyOrdersApi.onRequestGet({
    request: legacyGetRequest(), env,
  });
  const envelope = await getResponse.json();
  assert.equal(envelope.orders[0].version, env.state.row.version);
  envelope.orders[0].customer = '闭环客户';

  const postResponse = await legacyOrdersApi.onRequestPost({
    request: legacyPostRequest({ eventId: operationId, order: envelope.orders[0] }), env,
  });

  assert.equal(postResponse.status, 200);
  assert.equal((await postResponse.json()).order.version, 5);
});

test('real legacy status UPSERT writes its audit with the request event id', async () => {
  const env = legacyMaintenanceEnvironment({ capabilities: ['ADVANCE_ORDER_STATUS'] });
  const next = { ...legacyOrder(env.state.row), status: '已完工' };

  const response = await legacyOrdersApi.onRequestPost({
    request: legacyPostRequest({ eventId: operationId, order: next }), env,
  });

  assert.equal(response.status, 200);
  assert.equal(env.state.upserts, 1);
  assert.equal(env.state.audits.length, 1);
  assert.equal(env.state.audits[0][0], 'change_order_status');
  assert.equal(env.state.audits[0][6], operationId);
});

test('legacy status and receipt maintenance fail closed without their independent capabilities', async () => {
  for (const [row, mutate] of [
    [databaseRow(), (order) => ({ ...order, status: '已完工' })],
    [databaseRow({ status: '已结算' }), (order) => ({
      ...order, settlementReceiptKey: 'receipts/tongda/new.png',
    })],
  ]) {
    const env = legacyMaintenanceEnvironment({ row, capabilities: [] });
    const response = await legacyOrdersApi.onRequestPost({
      request: legacyPostRequest({ eventId: operationId, order: mutate(legacyOrder(row)) }), env,
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: 'CAPABILITY_DISABLED' });
    assert.equal(env.state.upserts, 0);
  }
});

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
  const env = environment();

  const response = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.order.version, payload.expectedVersion + 1);
  assert.equal(body.order.customer, '张先生');
  assert.equal(body.order.status, '在修中');
  assert.deepEqual(env.state.batchKinds, ['audit-sentinel', 'order-update', 'operation-complete']);
  assert.equal(env.state.row.version, payload.expectedVersion + 1);
  const scopedAuditId = await expectedAuditEventId();
  assert.equal(env.state.auditRows.filter((row) => row.event_id === scopedAuditId).length, 1);

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

test('a foreign global event-id collision cannot become this command audit sentinel', async () => {
  const payload = validPayload();
  const foreignAudit = {
    event_id: operationId,
    action: 'update_order',
    target_type: 'repair_order',
    target_id: 'RO-1',
  };
  const env = environment({
    auditRows: [foreignAudit],
  });
  const scopedAuditId = await expectedAuditEventId();

  const response = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });

  assert.equal(response.status, 200);
  assert.deepEqual(env.state.actualBatchChanges, [1, 1, 1]);
  assert.equal(env.state.auditRows.filter((row) => row.event_id === operationId).length, 1);
  assert.equal(env.state.auditRows.filter((row) => row.event_id === scopedAuditId).length, 1);
  assert.equal(env.state.operation.state, 'completed');
});

test('a pre-existing command-owned sentinel permits [0,1,1] recovery without a false conflict', async () => {
  const payload = validPayload();
  const scopedAuditId = await expectedAuditEventId();
  const env = environment({
    auditRows: [{
      event_id: scopedAuditId,
      action: 'update_order',
      target_type: 'repair_order',
      target_id: 'RO-1',
    }],
  });

  const response = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });

  assert.equal(response.status, 200);
  assert.deepEqual(env.state.actualBatchChanges, [0, 1, 1]);
  assert.equal(env.state.row.version, payload.expectedVersion + 1);
  assert.equal(env.state.auditRows.filter((row) => row.event_id === scopedAuditId).length, 1);
  assert.equal(env.state.operation.http_status, 200);
});

test('completion refuses [1,0,1] without the order postcondition and stores a stable conflict', async () => {
  const payload = validPayload();
  const foreignAudit = {
    event_id: operationId,
    action: 'update_order',
    target_type: 'repair_order',
    target_id: 'RO-1',
  };
  const env = environment({
    auditRows: [foreignAudit],
    blockOrderUpdate: true,
    reportedBatchChanges: [1, 0, 1],
  });

  const response = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.error, 'ORDER_VERSION_CONFLICT');
  assert.notEqual(body.error, 'OPERATION_IN_PROGRESS');
  assert.deepEqual(env.state.reportedBatchChanges, [1, 0, 1]);
  assert.deepEqual(env.state.actualBatchChanges, [1, 0, 0]);
  assert.equal(env.state.row.version, payload.expectedVersion);
  assert.equal(env.state.operation.state, 'completed');
  assert.equal(env.state.operation.http_status, 409);
  const scopedAuditId = await expectedAuditEventId();
  assert.equal(env.state.auditRows.filter((row) => row.event_id === scopedAuditId).length, 0);
  assert.equal(env.state.auditRows.filter((row) => row.event_id === operationId).length, 1);
});

test('a retry preserves a prior command audit after the order advances beyond its exact result', async () => {
  const payload = validPayload();
  const scopedAuditId = await expectedAuditEventId();
  const advancedRow = databaseRow();
  advancedRow.version = payload.expectedVersion + 2;
  advancedRow.updated_at = '2026-07-22 15:00:00';
  advancedRow.record = 'advanced by another command';
  const env = environment({
    row: advancedRow,
    auditRows: [{
      event_id: scopedAuditId,
      action: 'update_order',
      target_type: 'repair_order',
      target_id: 'RO-1',
    }],
  });

  const response = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'OPERATION_RECONCILIATION_REQUIRED' });
  assert.deepEqual(env.state.actualBatchChanges, [0, 0, 0]);
  assert.equal(env.state.auditRows.filter((row) => row.event_id === scopedAuditId).length, 1);
  assert.equal(env.state.row.version, payload.expectedVersion + 2);
  assert.equal(env.state.operation.state, 'started');
  assert.equal(env.state.operation.http_status, 0);
});

test('audit cleanup failure never stores or claims a terminal conflict', async () => {
  const payload = validPayload();
  const scopedAuditId = await expectedAuditEventId();
  const env = environment({
    blockOrderUpdate: true,
    blockAuditCleanup: true,
  });

  const response = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'AUDIT_SENTINEL_CLEANUP_FAILED' });
  assert.equal(env.state.auditRows.filter((row) => row.event_id === scopedAuditId).length, 1);
  assert.equal(env.state.operation.state, 'started');
  assert.equal(env.state.operation.http_status, 0);
});

test('audit cleanup preserves a concurrent exact success and recovers operation completion', async () => {
  const payload = validPayload();
  const scopedAuditId = await expectedAuditEventId();
  const env = environment({
    blockOrderUpdate: true,
    completeOrderBeforeAuditCleanup: true,
  });

  const response = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });

  assert.equal(response.status, 200);
  assert.equal(env.state.auditRows.filter((row) => row.event_id === scopedAuditId).length, 1);
  assert.equal(env.state.row.version, payload.expectedVersion + 1);
  assert.equal(env.state.operation.state, 'completed');
  assert.equal(env.state.operation.http_status, 200);
});

test('completion also requires the submitted edit values, not only version and timestamp', async () => {
  const payload = validPayload();
  const env = environment({
    blockOrderUpdate: true,
    spoofVersionTimestamp: true,
  });

  const response = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.error, 'ORDER_VERSION_CONFLICT');
  assert.deepEqual(env.state.actualBatchChanges, [1, 0, 0]);
  assert.equal(env.state.operation.http_status, 409);
  assert.notEqual(env.state.row.record, String(payload.order.record).trim());
});

test('a missed version precondition stores and deterministically replays a terminal 409', async () => {
  const payload = validPayload();
  const env = environment({ batchConflict: true });

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

test('a completed terminal conflict replays before mutable authorization and order checks', async () => {
  const scenarios = [
    ['voided', (state) => { state.row.voided = 1; }],
    ['settled', (state) => { state.row.status = '已结算'; }],
    ['capability-disabled', (state) => {
      state.capabilities.splice(0, state.capabilities.length, { capability: 'VIEW_ORDERS', enabled: 1 });
    }],
    ['permission-revoked', (state) => { state.session.permissions = '["history"]'; }],
    ['dictionary-changed', (state) => {
      state.dictionaries.splice(0, state.dictionaries.length);
    }],
  ];

  for (const [name, mutate] of scenarios) {
    const payload = validPayload();
    const env = environment({ batchConflict: true });
    const first = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });
    const firstBody = await first.json();
    assert.equal(first.status, 409, name);

    mutate(env.state);
    const replay = await patchOrder({ request: request(payload), env, params: { id: 'RO-1' } });
    assert.equal(replay.status, 409, name);
    assert.deepEqual(await replay.json(), firstBody, name);

    const changed = structuredClone(payload);
    changed.order.customer = `${changed.order.customer}-${name}`;
    const reuse = await patchOrder({ request: request(changed), env, params: { id: 'RO-1' } });
    assert.equal(reuse.status, 409, name);
    assert.deepEqual(await reuse.json(), { error: 'OPERATION_ID_REUSED' }, name);
  }
});

test('same operation hash replays once while hash reuse and an active lease are rejected', async () => {
  const payload = validPayload();
  const replayEnv = environment();
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

async function expectedAuditEventId() {
  return sha256Hex(JSON.stringify(['tongda', 'worker', 'edit_order', operationId]));
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

function legacyGetRequest() {
  return new Request('https://example.test/api/orders', {
    headers: { authorization: 'Bearer test-token' },
  });
}

function legacyPostRequest(payload) {
  return new Request('https://example.test/api/orders', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
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
  dictionaries = dictionaryRows(),
  batchConflict = false,
  auditRows = [],
  blockOrderUpdate = false,
  reportedBatchChanges = null,
  spoofVersionTimestamp = false,
  blockAuditCleanup = false,
  completeOrderBeforeAuditCleanup = false,
} = {}) {
  const calls = [];
  const operations = suppliedOperations || new Map();
  const state = {
    row: row ? { ...row } : null,
    operation: operation ? { ...operation } : null,
    operations,
    auditRows: auditRows.map((row) => ({ ...row })),
    batchKinds: [],
    batches: 0,
    batchConflict,
    capabilities,
    dictionaries,
    session,
    blockOrderUpdate,
    reportedBatchChanges,
    actualBatchChanges: [],
    spoofVersionTimestamp,
    blockAuditCleanup,
    completeOrderBeforeAuditCleanup,
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
      }
      state.actualBatchChanges = statements.map((item) => evaluateBatchStatement(item));
      state.reportedBatchChanges = state.reportedBatchChanges || [...state.actualBatchChanges];
      return state.reportedBatchChanges.map((count) => ({
        success: true,
        meta: { changes: count },
      }));
    },
  };

  function evaluateBatchStatement(item) {
    switch (batchKind(item.sql)) {
      case 'audit-sentinel': return evaluateAuditSentinel(item.values);
      case 'order-update': return evaluateOrderUpdate(item.values);
      case 'operation-complete': return evaluateOperationComplete(item.sql, item.values);
      default: throw new Error(`Unexpected batch SQL: ${item.sql}`);
    }
  }

  function evaluateAuditSentinel(values) {
    const eventId = values[2];
    if (state.auditRows.some((row) => row.event_id === eventId)) return 0;
    const operationRow = operations.get(values.slice(8, 12).join('|'));
    const orderMatches = state.row
      && state.row.company_id === values[5]
      && state.row.id === values[6]
      && state.row.version === values[7]
      && state.row.voided === 0
      && ['在修中', '已完工', '待结算'].includes(state.row.status);
    const leaseMatches = operationRow
      && operationRow.state === 'started'
      && operationRow.lease_token === values[12]
      && operationRow.target_id === values[13];
    if (!orderMatches || !leaseMatches) return 0;
    state.auditRows.push({
      event_id: eventId,
      action: 'update_order',
      target_type: 'repair_order',
      target_id: values[6],
    });
    return 1;
  }

  function evaluateOrderUpdate(values) {
    if (state.blockOrderUpdate) {
      if (state.spoofVersionTimestamp && state.row) {
        state.row.version = values[20] + 1;
        state.row.updated_at = values[17];
      }
      return 0;
    }
    const operationRow = operations.get(values.slice(22, 26).join('|'));
    const sentinel = state.auditRows.some((row) => (
      row.event_id === values[21]
      && row.action === 'update_order'
      && row.target_type === 'repair_order'
      && row.target_id === values[19]
    ));
    const orderMatches = state.row
      && state.row.company_id === values[18]
      && state.row.id === values[19]
      && state.row.version === values[20]
      && state.row.voided === 0
      && ['在修中', '已完工', '待结算'].includes(state.row.status);
    const leaseMatches = operationRow
      && operationRow.state === 'started'
      && operationRow.lease_token === values[26]
      && operationRow.target_id === values[27];
    if (!sentinel || !orderMatches || !leaseMatches) return 0;
    state.row = {
      ...state.row,
      customer: values[0], phone: values[1], plate: values[2], car: values[3], vin: values[4],
      staff: values[5], insurance_expiry: values[6], insurer: values[7], type: values[8],
      accident_type: values[9], claim_no: values[10], record: values[11], labor: values[12],
      material: values[13], amount: values[14], delivery: values[15], remark: values[16],
      version: state.row.version + 1, updated_at: values[17],
    };
    return 1;
  }

  function evaluateOperationComplete(sql, values) {
    const operationRow = operations.get(values.slice(2, 6).join('|'));
    const leaseMatches = operationRow
      && operationRow.state === 'started'
      && operationRow.lease_token === values[6]
      && operationRow.target_id === values[7];
    const sentinel = state.auditRows.some((row) => (
      row.event_id === values[8]
      && row.action === 'update_order'
      && row.target_type === 'repair_order'
      && row.target_id === values[9]
    ));
    let postcondition = true;
    if (sql.includes('-- require-order-postcondition')) {
      postcondition = Boolean(state.row
        && state.row.company_id === values[10]
        && state.row.id === values[11]
        && state.row.version === values[12]
        && state.row.updated_at === values[13]);
      if (postcondition && sql.includes('-- require-edit-values')) {
        postcondition = rowMatchesCompletionValues(state.row, values.slice(14));
      }
    }
    if (!leaseMatches || !sentinel || !postcondition) return 0;
    operationRow.state = 'completed';
    operationRow.http_status = values[0];
    operationRow.response_json = values[1];
    operationRow.lease_token = '';
    operationRow.lease_until = '';
    state.operation = operationRow;
    return 1;
  }

  function rowMatchesCompletionValues(row, values) {
    return row.customer === values[0]
      && row.phone === values[1]
      && row.plate === values[2]
      && row.car === values[3]
      && row.vin === values[4]
      && row.staff === values[5]
      && row.insurance_expiry === values[6]
      && row.insurer === values[7]
      && row.type === values[8]
      && row.accident_type === values[9]
      && row.claim_no === values[10]
      && row.record === values[11]
      && row.labor === values[12]
      && row.material === values[13]
      && row.amount === values[14]
      && row.delivery === values[15]
      && row.remark === values[16];
  }

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
        if (sql.includes('FROM operation_logs')) {
          return state.auditRows.find((row) => (
            row.event_id === values[0]
            && row.action === 'update_order'
            && row.target_type === 'repair_order'
            && row.target_id === values[1]
          )) || null;
        }
        throw new Error(`Unexpected first SQL: ${sql}`);
      },
      async all() {
        if (sql.includes('FROM company_capabilities')) return { results: state.capabilities };
        if (sql.includes('FROM system_dictionaries')) return { results: state.dictionaries };
        if (sql.includes('SELECT * FROM repair_orders')) return { results: state.row ? [{ ...state.row }] : [] };
        throw new Error(`Unexpected all SQL: ${sql}`);
      },
      async run() {
        if (sql.includes('DELETE FROM operation_logs')) {
          if (state.completeOrderBeforeAuditCleanup && state.row) {
            state.row = applyCompletionValues(state.row, values.slice(6));
            state.row.version = values[4];
            state.row.updated_at = values[5];
          }
          const orderCompleted = state.row
            && state.row.company_id === values[2]
            && state.row.id === values[3]
            && state.row.version === values[4]
            && state.row.updated_at === values[5]
            && rowMatchesCompletionValues(state.row, values.slice(6));
          if (state.blockAuditCleanup || orderCompleted) return { meta: { changes: 0 } };
          const index = state.auditRows.findIndex((row) => (
            row.event_id === values[0]
            && row.action === 'update_order'
            && row.target_type === 'repair_order'
            && row.target_id === values[1]
          ));
          if (index < 0) return { meta: { changes: 0 } };
          state.auditRows.splice(index, 1);
          return { meta: { changes: 1 } };
        }
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

  function applyCompletionValues(row, values) {
    return {
      ...row,
      customer: values[0], phone: values[1], plate: values[2], car: values[3], vin: values[4],
      staff: values[5], insurance_expiry: values[6], insurer: values[7], type: values[8],
      accident_type: values[9], claim_no: values[10], record: values[11], labor: values[12],
      material: values[13], amount: values[14], delivery: values[15], remark: values[16],
    };
  }

  return { DB, calls, state };
}

function legacyMaintenanceEnvironment({ row = databaseRow(), capabilities = [] } = {}) {
  const state = { row, upserts: 0, audits: [] };
  const session = { ...staffSession(), role: 'admin' };
  return {
    state,
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            return {
              first: async () => {
                if (sql.includes('FROM access_sessions')) return session;
                if (sql.includes('FROM repair_orders')) return { ...state.row };
                throw new Error(`Unexpected first SQL: ${sql}`);
              },
              all: async () => {
                if (sql.includes('FROM company_capabilities')) {
                  return { results: capabilities.map((capability) => ({ capability, enabled: 1 })) };
                }
                throw new Error(`Unexpected all SQL: ${sql}`);
              },
              run: async () => {
                if (sql.includes('INSERT INTO repair_orders')) {
                  state.upserts += 1;
                  return { meta: { changes: 1 } };
                }
                if (sql.includes('INSERT OR IGNORE INTO operation_logs')) {
                  state.audits.push(values);
                  return { meta: { changes: 1 } };
                }
                throw new Error(`Unexpected run SQL: ${sql}`);
              },
            };
          },
        };
      },
    },
  };
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

function legacyOrder(row) {
  return {
    id: row.id, companyId: row.company_id, version: row.version,
    date: row.date, time: row.time, plate: row.plate, customer: row.customer,
    phone: row.phone, car: row.car, insurer: row.insurer,
    insuranceExpiry: row.insurance_expiry, type: row.type, status: row.status,
    labor: row.labor, material: row.material, amount: row.amount, record: row.record,
    staff: row.staff, delivery: row.delivery, vin: row.vin, claimNo: row.claim_no,
    accidentType: row.accident_type, paymentMethod: row.payment_method, remark: row.remark,
    settlementDate: row.settlement_date, settlementTime: row.settlement_time,
    settlementRemark: row.settlement_remark, settlementReceiptKey: row.settlement_receipt_key,
    settlementReceiptName: row.settlement_receipt_name,
    settlementReceiptType: row.settlement_receipt_type,
    settlementReceiptSize: row.settlement_receipt_size,
    settlementReceiptUploadedAt: row.settlement_receipt_uploaded_at,
    voided: row.voided, voidedAt: row.voided_at, voidReason: row.void_reason,
  };
}
