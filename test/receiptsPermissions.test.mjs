import test from 'node:test';
import assert from 'node:assert/strict';

import { onRequestDelete, onRequestPost } from '../functions/api/receipts.js';

function staffEnvironment() {
  return {
    DB: {
      prepare() {
        return {
          bind() {
            return {
              first: async () => ({
                token: 'staff-token',
                role: 'staff',
                label: 'QA Staff',
                company_id: 'tongda',
                username: 'qa-staff',
                display_name: 'QA Staff',
                permissions: '["repair","history"]',
              }),
            };
          },
        };
      },
    },
  };
}

function adminEnvironment(capabilities = []) {
  return {
    DB: {
      prepare(sql) {
        return {
          bind() {
            return {
              first: async () => ({
                token: 'admin-token', role: 'admin', label: 'QA Admin', company_id: 'tongda',
                username: 'qa-admin', display_name: 'QA Admin', permissions: '[]',
              }),
              all: async () => {
                if (sql.includes('FROM company_capabilities')) return { results: capabilities };
                throw new Error(`Unexpected SQL: ${sql}`);
              },
            };
          },
        };
      },
    },
  };
}

async function assertAdminRequired(response) {
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'ADMIN_REQUIRED' });
}

test('staff cannot upload settlement receipts', async () => {
  const request = new Request('https://example.test/api/receipts', {
    method: 'POST',
    headers: { authorization: 'Bearer staff-token' },
  });

  await assertAdminRequired(await onRequestPost({ request, env: staffEnvironment() }));
});

test('staff cannot delete settlement receipts', async () => {
  const request = new Request('https://example.test/api/receipts', {
    method: 'DELETE',
    headers: {
      authorization: 'Bearer staff-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ key: 'receipts/tongda/2026/test.png', orderId: 'RO-1' }),
  });

  await assertAdminRequired(await onRequestDelete({ request, env: staffEnvironment() }));
});

test('SETTLE_ORDER does not authorize receipt upload without MAINTAIN_RECEIPT', async () => {
  const request = new Request('https://example.test/api/receipts', {
    method: 'POST',
    headers: { authorization: 'Bearer admin-token' },
    body: new FormData(),
  });
  const response = await onRequestPost({
    request,
    env: adminEnvironment([{ capability: 'SETTLE_ORDER', enabled: 1 }]),
  });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'CAPABILITY_DISABLED' });
});

test('SETTLE_ORDER does not authorize receipt deletion without MAINTAIN_RECEIPT', async () => {
  const request = new Request('https://example.test/api/receipts', {
    method: 'DELETE',
    headers: { authorization: 'Bearer admin-token', 'content-type': 'application/json' },
    body: JSON.stringify({ key: 'receipts/tongda/2026/test.png', orderId: 'RO-1' }),
  });
  const response = await onRequestDelete({
    request,
    env: adminEnvironment([{ capability: 'SETTLE_ORDER', enabled: 1 }]),
  });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'CAPABILITY_DISABLED' });
});
