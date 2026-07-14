import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NetworkUnavailableError,
  apiFetch,
  resetApiClientForTests,
  setApiClientFetchForTests,
  setNetworkReporter,
  setSessionExpiredReporter,
} from '../src/platform/apiClient.js';

test.afterEach(() => resetApiClientForTests());

test('GET uses the resolved API URL and reports success', async () => {
  const calls = [];
  const events = [];
  setApiClientFetchForTests(async (url, init) => {
    calls.push({ url, init });
    return new Response('{}', { status: 200 });
  });
  setNetworkReporter({
    isOnline: () => true,
    success: () => events.push('success'),
    failure: () => {},
  });

  await apiFetch('/api/orders', {}, { desktop: true });

  assert.equal(calls[0].url, 'https://chengxu.pages.dev/api/orders');
  assert.deepEqual(events, ['success']);
});

test('offline mutation is rejected before fetch', async () => {
  let called = false;
  setApiClientFetchForTests(async () => {
    called = true;
    return new Response('{}');
  });
  setNetworkReporter({
    isOnline: () => false,
    success: () => {},
    failure: () => {},
  });

  await assert.rejects(
    apiFetch('/api/orders', { method: 'POST' }, { desktop: true }),
    NetworkUnavailableError,
  );
  assert.equal(called, false);
});

test('authenticated 401 reports an expired session', async () => {
  let expired = false;
  setApiClientFetchForTests(async () => new Response('{}', { status: 401 }));
  setSessionExpiredReporter(() => {
    expired = true;
  });

  await apiFetch(
    '/api/orders',
    { headers: { authorization: 'Bearer expired' } },
    { desktop: false },
  );

  assert.equal(expired, true);
});
