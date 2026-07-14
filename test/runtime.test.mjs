import test from 'node:test';
import assert from 'node:assert/strict';
import { isTauriRuntime, resolveApiUrl } from '../src/platform/runtime.js';

test('detects a Tauri runtime without touching the real window', () => {
  assert.equal(isTauriRuntime({ __TAURI_INTERNALS__: {} }), true);
  assert.equal(isTauriRuntime({}), false);
});

test('web API paths remain same-origin', () => {
  assert.equal(resolveApiUrl('/api/orders', { desktop: false }), '/api/orders');
});

test('desktop API paths use the fixed production origin', () => {
  assert.equal(
    resolveApiUrl('/api/orders?status=open', { desktop: true }),
    'https://chengxu.pages.dev/api/orders?status=open',
  );
});
