import test from 'node:test';
import assert from 'node:assert/strict';

import {
  companySyncStorageKey,
  readCompanySyncAt,
  runCompanyFullSync,
  writeCompanySyncAt,
} from '../src/companySyncLogic.js';

test('stores valid sync time independently for each company', () => {
  const storage = new Map();
  writeCompanySyncAt(storage, 'tongda', '2026-07-29T08:30:00.000Z');
  writeCompanySyncAt(storage, 'xinqiheng', '2026-07-29T09:00:00.000Z');

  assert.equal(companySyncStorageKey('tongda'), 'zhiwei:company-sync:tongda');
  assert.equal(readCompanySyncAt(storage, 'tongda'), '2026-07-29T08:30:00.000Z');
  assert.equal(readCompanySyncAt(storage, 'xinqiheng'), '2026-07-29T09:00:00.000Z');
});

test('updates sync time only after all business sources finish successfully', async () => {
  const calls = [];
  const result = await runCompanyFullSync({
    now: () => '2026-07-29T09:15:00.000Z',
    refreshOrders: async () => { calls.push('orders'); },
    refreshVehicles: async () => { calls.push('vehicles'); },
    refreshPolicies: async () => { calls.push('policies'); },
    refreshHistory: async () => { calls.push('history'); },
  });

  assert.deepEqual(new Set(calls), new Set(['orders', 'vehicles', 'policies', 'history']));
  assert.deepEqual(result, { ok: true, at: '2026-07-29T09:15:00.000Z' });
});

test('does not return a new timestamp when one business source fails', async () => {
  const result = await runCompanyFullSync({
    now: () => '2026-07-29T09:15:00.000Z',
    refreshOrders: async () => {},
    refreshVehicles: async () => {},
    refreshPolicies: async () => { throw new Error('保险档案读取失败'); },
    refreshHistory: async () => {},
  });

  assert.deepEqual(result, { ok: false, error: '保险档案读取失败' });
});
