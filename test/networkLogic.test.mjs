import test from 'node:test';
import assert from 'node:assert/strict';
import { createNetworkState, reduceNetworkState } from '../src/networkLogic.js';

test('a successful health check records online and sync time', () => {
  const result = reduceNetworkState(createNetworkState(), {
    type: 'success',
    at: '2026-07-14T01:00:00.000Z',
  });
  assert.deepEqual(result, {
    status: 'online',
    lastSyncedAt: '2026-07-14T01:00:00.000Z',
  });
});

test('a request failure enters offline without losing the previous sync time', () => {
  const current = {
    status: 'online',
    lastSyncedAt: '2026-07-14T01:00:00.000Z',
  };
  assert.deepEqual(reduceNetworkState(current, { type: 'failure' }), {
    status: 'offline',
    lastSyncedAt: '2026-07-14T01:00:00.000Z',
  });
});

test('checking preserves the last successful sync time', () => {
  const current = {
    status: 'offline',
    lastSyncedAt: '2026-07-14T01:00:00.000Z',
  };
  assert.deepEqual(reduceNetworkState(current, { type: 'checking' }), {
    status: 'checking',
    lastSyncedAt: '2026-07-14T01:00:00.000Z',
  });
});
