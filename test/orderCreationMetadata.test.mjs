import test from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet } from '../functions/api/order-creation-metadata.js';

test('metadata endpoint returns company dictionaries and capability intersection', async () => {
  const env = environment({
    capabilities: [
      { capability: 'VIEW_ORDERS', enabled: 1 },
      { capability: 'CREATE_ORDER', enabled: 1 },
      { capability: 'SETTLE_ORDER', enabled: 1 },
    ],
    dictionaries: [
      { id: 'i-1', category: 'insurer', value: '人保财险', extra: '', sort_order: 10 },
      { id: 's-1', category: 'staff', value: '接待顾问', extra: '张工', sort_order: 10 },
    ],
  });
  const response = await onRequestGet({ request: authenticatedRequest(), env });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.canCreate, true);
  assert.deepEqual(payload.capabilities, ['VIEW_ORDERS', 'CREATE_ORDER']);
  assert.equal(payload.metadata.contractVersion, 1);
  assert.deepEqual(payload.metadata.options.insurers, ['人保财险']);
  assert.deepEqual(payload.metadata.options.staff, [{ id: 's-1', name: '张工', title: '接待顾问' }]);
  assert.match(payload.serverTime, /^\d{4}-\d{2}-\d{2}T/);
  const dictionaryQuery = env.calls.find((call) => call.sql.includes('FROM system_dictionaries'));
  assert.deepEqual(dictionaryQuery.values, ['tongda']);
  assert.match(dictionaryQuery.sql, /is_active = 1/);
});

test('metadata endpoint keeps the form read-only when company create capability is disabled', async () => {
  const env = environment({ capabilities: [{ capability: 'VIEW_ORDERS', enabled: 1 }] });
  const response = await onRequestGet({ request: authenticatedRequest(), env });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.canCreate, false);
  assert.deepEqual(payload.capabilities, ['VIEW_ORDERS']);
});

test('metadata endpoint rejects missing and expired sessions', async () => {
  const missing = await onRequestGet({ request: new Request('https://example.test/api/order-creation-metadata'), env: environment() });
  assert.equal(missing.status, 401);
  assert.deepEqual(await missing.json(), { error: 'UNAUTHORIZED' });

  const expired = await onRequestGet({
    request: authenticatedRequest(),
    env: environment({ session: null }),
  });
  assert.equal(expired.status, 401);
  assert.deepEqual(await expired.json(), { error: 'SESSION_EXPIRED' });
});

function authenticatedRequest() {
  return new Request('https://example.test/api/order-creation-metadata', {
    headers: { authorization: 'Bearer test-token' },
  });
}

function environment({
  session = {
    token: 'test-token', role: 'staff', label: '员工', company_id: 'tongda',
    username: 'worker', display_name: '员工', permissions: '["repair","history"]',
  },
  capabilities = [],
  dictionaries = [],
} = {}) {
  const calls = [];
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
            if (sql.includes('FROM system_dictionaries')) {
              return { all: async () => ({ results: dictionaries }) };
            }
            throw new Error(`Unexpected SQL: ${sql}`);
          },
        };
      },
    },
  };
}
