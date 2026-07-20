import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginOperation,
  completeOperation,
  decodeOrderCursor,
  encodeOrderCursor,
  findOperation,
  readCapabilities,
} from '../functions/_shared/order-foundation.js';

test('cursor round trips full and delta modes with unicode-safe values', () => {
  for (const value of [
    { mode: 'full', scope: 'current', updatedAt: '2026-07-20 10:00:00', id: 'RO-1' },
    { mode: 'delta', scope: 'history', updatedAt: '2026-07-20 10:00:01', id: '蒙K-2' },
  ]) {
    assert.deepEqual(decodeOrderCursor(encodeOrderCursor(value)), value);
  }
});

test('cursor rejects malformed payloads and unsupported modes', () => {
  assert.equal(decodeOrderCursor('not-base64'), null);
  assert.equal(decodeOrderCursor(encodeRawCursor({ mode: 'other', scope: 'current', updatedAt: 'time', id: 'RO-1' })), null);
  assert.equal(decodeOrderCursor(encodeRawCursor({ mode: 'full', scope: 'other', updatedAt: 'time', id: 'RO-1' })), null);
  assert.equal(decodeOrderCursor(encodeRawCursor({ mode: 'full', updatedAt: 'time', id: 'RO-1' })), null);
  assert.equal(decodeOrderCursor(encodeRawCursor({ mode: 'full', scope: 'current', updatedAt: '', id: 'RO-1' })), null);
  assert.equal(decodeOrderCursor(encodeRawCursor({ mode: 'delta', scope: 'history', updatedAt: 'time', id: 7 })), null);
});

test('capabilities require both a company switch and role permission', async () => {
  const env = capabilityEnvironment([
    { capability: 'VIEW_ORDERS', enabled: 1 },
    { capability: 'CREATE_ORDER', enabled: 1 },
    { capability: 'SETTLE_ORDER', enabled: 1 },
    { capability: 'EXPORT_DATA', enabled: 1 },
  ]);
  const staff = { role: 'staff', company_id: 'tongda', permissions: '["repair","history"]' };
  const admin = { role: 'admin', company_id: 'tongda', permissions: '[]' };

  assert.deepEqual(await readCapabilities(env, staff), ['VIEW_ORDERS', 'CREATE_ORDER']);
  assert.deepEqual(
    await readCapabilities(env, admin),
    ['VIEW_ORDERS', 'CREATE_ORDER', 'SETTLE_ORDER', 'EXPORT_DATA'],
  );
  assert.deepEqual(env.binds, [['tongda'], ['tongda']]);
});

test('view orders is the only safe default when company has no rows', async () => {
  const env = capabilityEnvironment([]);

  assert.deepEqual(
    await readCapabilities(env, { role: 'staff', company_id: 'new-company', permissions: '["repair"]' }),
    ['VIEW_ORDERS'],
  );
  assert.deepEqual(
    await readCapabilities(env, { role: 'staff', company_id: 'new-company', permissions: '["history"]' }),
    [],
  );
});

test('operation helpers persist and return one completed result for the same key', async () => {
  const env = operationEnvironment();
  const key = {
    companyId: 'tongda',
    actor: 'worker-001',
    action: 'create_order',
    operationId: 'op-001',
  };

  await beginOperation(env, key, 'hash-001', 'RO-001');
  await completeOperation(env, key, 201, { order: { id: 'RO-001' } });
  const result = await findOperation(env, key);

  assert.deepEqual(result, {
    state: 'completed',
    http_status: 201,
    response_json: '{"order":{"id":"RO-001"}}',
    request_hash: 'hash-001',
    target_id: 'RO-001',
  });
});

function encodeRawCursor(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function capabilityEnvironment(rows) {
  const binds = [];
  return {
    binds,
    DB: {
      prepare(sql) {
        assert.match(sql, /FROM company_capabilities/);
        return {
          bind(...values) {
            binds.push(values);
            return { all: async () => ({ results: rows }) };
          },
        };
      },
    },
  };
}

function operationEnvironment() {
  const records = new Map();
  return {
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            if (sql.includes('INSERT OR IGNORE INTO order_operations')) {
              return {
                run: async () => {
                  const [companyId, actor, action, operationId, targetId, requestHash] = values;
                  const key = [companyId, actor, action, operationId].join('|');
                  if (!records.has(key)) {
                    records.set(key, {
                      state: 'started', http_status: 0, response_json: '',
                      request_hash: requestHash, target_id: targetId,
                    });
                  }
                  return { success: true };
                },
              };
            }
            if (sql.includes("SET state = 'completed'")) {
              return {
                run: async () => {
                  const [status, responseJson, companyId, actor, action, operationId] = values;
                  const key = [companyId, actor, action, operationId].join('|');
                  Object.assign(records.get(key), {
                    state: 'completed', http_status: status, response_json: responseJson,
                  });
                  return { success: true };
                },
              };
            }
            if (sql.includes('SELECT state')) {
              return {
                first: async () => records.get(values.join('|')) || null,
              };
            }
            throw new Error(`Unexpected SQL: ${sql}`);
          },
        };
      },
    },
  };
}
