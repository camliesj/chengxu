import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  normalizeStatusCommand,
  isOrdinaryStatusTarget,
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
