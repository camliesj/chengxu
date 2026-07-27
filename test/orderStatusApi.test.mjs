import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  normalizeStatusCommand,
  isOrdinaryStatusTarget,
  handleStatusCommand,
} from '../functions/_shared/order-status.js';
import { canTransitionOrderStatus } from '../shared/orderStatusPermissions.js';
import { onRequestPost as postStatus } from '../functions/api/orders/[id]/status.js';
import { onRequestGet as getStatusOperation } from '../functions/api/order-operations/change-order-status/[operationId].js';

const contract = JSON.parse(
  await readFile(new URL('../contracts/order-status-v1.json', import.meta.url), 'utf8'),
);
const operationId = '2c6df5a0-89c8-482f-8d47-4d00409af001';

test('status contract permits only the declared role-specific adjacent transitions', () => {
  for (const edge of contract.allowedCases) {
    assert.equal(canTransitionOrderStatus(edge.role, edge.from, edge.to), true, edge.name);
    assert.equal(isOrdinaryStatusTarget(edge.to), true, edge.name);
  }
  for (const edge of contract.forbiddenCases) {
    assert.equal(canTransitionOrderStatus(edge.role, edge.from, edge.to), false, edge.name);
  }
});

test('normalizes only a UUID operation, positive version, and ordinary target', () => {
  const targetStatus = contract.allowedCases[0].to;
  assert.deepEqual(
    normalizeStatusCommand({ operationId, expectedVersion: 4, targetStatus }),
    { value: { operationId, expectedVersion: 4, targetStatus }, error: '' },
  );
  assert.equal(normalizeStatusCommand({ operationId: 'not-a-uuid', expectedVersion: 4, targetStatus }).error, 'OPERATION_ID_REQUIRED');
  assert.equal(normalizeStatusCommand({ operationId, expectedVersion: 0, targetStatus }).error, 'EXPECTED_VERSION_REQUIRED');
  assert.equal(normalizeStatusCommand({ operationId, expectedVersion: 4, targetStatus: 'settled' }).error, 'TARGET_STATUS_INVALID');
});

test('status mutation and operation query require an authenticated session', async () => {
  const request = new Request('https://example.test/api/orders/RO-1/status', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
  });
  const env = { DB: { prepare() { throw new Error('database must not be queried without a bearer token'); } } };
  const mutation = await postStatus({ request, env, params: { id: 'RO-1' } });
  assert.equal(mutation.status, 401);
  assert.deepEqual(await mutation.json(), { error: 'UNAUTHORIZED' });

  const query = await getStatusOperation({
    request: new Request('https://example.test/api/order-operations/change-order-status/x'),
    env,
    params: { operationId: operationId },
  });
  assert.equal(query.status, 401);
});

test('status command fails closed for missing repair permission, capability, and non-adjacent target', async () => {
  const staffFrom = contract.allowedCases[0];
  const jump = contract.forbiddenCases.find((edge) => edge.role === 'staff' && edge.from === staffFrom.from);
  const payload = { operationId, expectedVersion: 4, targetStatus: staffFrom.to };

  const permission = await handleStatusCommand({
    env: commandEnvironment({ status: staffFrom.from, permissions: '["history"]', capabilities: ['ADVANCE_ORDER_STATUS'] }),
    session: session({ permissions: '["history"]' }), orderId: 'RO-1', payload,
  });
  assert.equal(permission.status, 403);
  assert.deepEqual(await permission.json(), { error: 'PERMISSION_REQUIRED' });

  const capability = await handleStatusCommand({
    env: commandEnvironment({ status: staffFrom.from, capabilities: [] }),
    session: session(), orderId: 'RO-1', payload,
  });
  assert.equal(capability.status, 403);
  assert.deepEqual(await capability.json(), { error: 'CAPABILITY_DISABLED' });

  const transition = await handleStatusCommand({
    env: commandEnvironment({ status: jump.from, capabilities: ['ADVANCE_ORDER_STATUS'] }),
    session: session(), orderId: 'RO-1', payload: { ...payload, targetStatus: jump.to },
  });
  assert.equal(transition.status, 403);
  assert.deepEqual(await transition.json(), { error: 'STATUS_TRANSITION_FORBIDDEN' });
});

test('status command writes one audit, one versioned update, and a completed operation', async () => {
  const edge = contract.allowedCases[0];
  const env = commandEnvironment({ status: edge.from, capabilities: ['ADVANCE_ORDER_STATUS'] });

  const response = await handleStatusCommand({
    env, session: session(), orderId: 'RO-1',
    payload: { operationId, expectedVersion: 4, targetStatus: edge.to },
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).order.status, edge.to);
  assert.deepEqual(env.state.batchKinds, ['audit-sentinel', 'order-update', 'operation-complete']);
  assert.equal(env.state.row.version, 5);
  assert.equal(env.state.auditRows.length, 1);
  assert.equal(env.state.operation.state, 'completed');
});

test('missed status version precondition persists and returns a stable conflict', async () => {
  const edge = contract.allowedCases[0];
  const env = commandEnvironment({
    status: edge.from,
    capabilities: ['ADVANCE_ORDER_STATUS'],
    batchChanges: [0, 0, 0],
  });

  const response = await handleStatusCommand({
    env, session: session(), orderId: 'RO-1',
    payload: { operationId, expectedVersion: 4, targetStatus: edge.to },
  });

  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.error, 'ORDER_STATUS_CONFLICT');
  assert.equal(body.order.id, 'RO-1');
  assert.equal(body.order.version, 4);
  assert.equal(body.order.status, edge.from);
  assert.equal(env.state.operation.state, 'completed');
  assert.equal(env.state.operation.http_status, 409);
});

function session({ permissions = '["repair"]' } = {}) {
  return {
    token: 'token', role: 'staff', label: 'worker', company_id: 'tongda', username: 'worker', permissions,
  };
}

function commandEnvironment({ status, permissions = '["repair"]', capabilities = [], batchChanges = [1, 1, 1] }) {
  const row = {
    id: 'RO-1', company_id: 'tongda', version: 4, status, voided: 0,
    updated_at: '2026-07-22 10:00:00', plate: 'A1', customer: 'C', phone: '', car: '', insurer: '',
    insurance_expiry: '', type: '', labor: 0, material: 0, amount: 0, record: '', staff: '', delivery: '',
    vin: '', claim_no: '', accident_type: '', payment_method: '', remark: '', settlement_date: '',
    settlement_time: '', settlement_remark: '', settlement_receipt_name: '', settlement_receipt_type: '',
    settlement_receipt_size: 0, settlement_receipt_uploaded_at: '',
  };
  const operations = new Map();
  const state = { row, operations, operation: null, auditRows: [], batchKinds: [] };
  const DB = {
    prepare(sql) { return statement(sql, []); },
    async batch(statements) {
      state.batchKinds = statements.map((statement) => (
        statement.sql.includes('-- audit-sentinel') ? 'audit-sentinel'
          : statement.sql.includes('-- order-update') ? 'order-update' : 'operation-complete'
      ));
      const audit = statements[0];
      if (batchChanges[0] === 1) state.auditRows.push({ eventId: audit.values[2] });
      const update = statements[1];
      if (batchChanges[1] === 1) {
        state.row = { ...state.row, status: update.values[0], updated_at: update.values[1], version: state.row.version + 1 };
      }
      const complete = statements[2];
      const operation = operations.get(complete.values.slice(2, 6).join('|'));
      if (batchChanges[2] === 1) {
        operation.state = 'completed';
        operation.http_status = complete.values[0];
        operation.response_json = complete.values[1];
        operation.lease_token = '';
        operation.lease_until = '';
      }
      state.operation = operation;
      return batchChanges.map((changes) => ({ meta: { changes } }));
    },
  };
  function statement(sql, values) {
    return {
      sql,
      values,
      bind(...nextValues) { return statement(sql, nextValues); },
      async first() {
        if (sql.includes('FROM repair_orders')) return values[0] === state.row.id && values[1] === state.row.company_id ? state.row : null;
        if (sql.includes('FROM order_operations')) return operations.get(values.join('|')) || null;
        throw new Error(`Unexpected first: ${sql}`);
      },
      async all() {
        if (sql.includes('FROM company_capabilities')) {
          return { results: capabilities.map((capability) => ({ capability, enabled: 1 })) };
        }
        throw new Error(`Unexpected all: ${sql}`);
      },
      async run() {
        if (sql.includes('INSERT OR IGNORE INTO order_operations')) {
          const key = values.slice(0, 4).join('|');
          const operation = {
            state: 'started', target_id: values[4], request_hash: values[5], lease_token: values[6],
            lease_until: '2999-01-01 00:00:00', http_status: 0, response_json: '',
          };
          operations.set(key, operation);
          state.operation = operation;
          return { meta: { changes: 1 } };
        }
        if (sql.includes("SET state = 'completed'")) {
          const operation = operations.get(values.slice(2, 6).join('|'));
          operation.state = 'completed';
          operation.http_status = values[0];
          operation.response_json = values[1];
          operation.lease_token = '';
          operation.lease_until = '';
          state.operation = operation;
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unexpected run: ${sql}`);
      },
    };
  }
  return {
    DB,
    state,
  };
}
