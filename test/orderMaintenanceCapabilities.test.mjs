import test from 'node:test';
import assert from 'node:assert/strict';

import { onRequestPost as voidOrder } from '../functions/api/orders/[id]/void.js';

test('void endpoint requires the company VOID_ORDER capability in addition to role permission', async () => {
  let writes = 0;
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind() {
            return {
              first: async () => {
                if (sql.includes('FROM access_sessions')) {
                  return {
                    token: 'admin-token', role: 'admin', label: 'Admin', company_id: 'tongda',
                    username: 'admin', permissions: '[]',
                  };
                }
                if (sql.includes('FROM repair_orders')) return { id: 'RO-1', plate: '蒙A12345', customer: '客户' };
                return null;
              },
              all: async () => {
                if (sql.includes('FROM company_capabilities')) return { results: [] };
                throw new Error(`Unexpected SQL: ${sql}`);
              },
              run: async () => { writes += 1; return { meta: { changes: 1 } }; },
            };
          },
        };
      },
    },
  };
  const response = await voidOrder({
    request: new Request('https://example.test/api/orders/RO-1/void', {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token', 'content-type': 'application/json' },
      body: JSON.stringify({ reason: '重复' }),
    }),
    env,
    params: { id: 'RO-1' },
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'CAPABILITY_DISABLED' });
  assert.equal(writes, 0);
});
