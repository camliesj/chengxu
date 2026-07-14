import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet as getClientReleases } from '../functions/api/client-releases.js';
import { onRequestGet as getClientUpdate } from '../functions/api/client-updates/[target]/[arch]/[currentVersion].js';

const releaseEnv = {
  DESKTOP_RELEASE_VERSION: '1.0.0',
  DESKTOP_RELEASE_PUBLISHED_AT: '2026-07-14T08:00:00Z',
  DESKTOP_RELEASE_NOTES: 'Initial Windows release',
  DESKTOP_RELEASE_DOWNLOAD_URL: 'https://downloads.example.com/chengxu-setup.exe',
  DESKTOP_RELEASE_UPDATE_URL: 'https://downloads.example.com/chengxu.nsis.zip',
  DESKTOP_RELEASE_SIGNATURE: 'signed-update',
};

test('public release endpoint reports configured Windows download', async () => {
  const response = await getClientReleases({ env: releaseEnv });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
  assert.equal(payload.windows.available, true);
  assert.equal(payload.windows.version, '1.0.0');
  assert.equal(payload.android.available, false);
});

test('updater returns no content when current version is latest', async () => {
  const response = await getClientUpdate({
    env: releaseEnv,
    params: { target: 'windows', arch: 'x86_64', currentVersion: '1.0.0' },
  });

  assert.equal(response.status, 204);
});

test('updater rejects unsupported architectures', async () => {
  const response = await getClientUpdate({
    env: releaseEnv,
    params: { target: 'windows', arch: 'arm64', currentVersion: '0.9.0' },
  });

  assert.equal(response.status, 204);
});

test('updater returns signed metadata for an older version', async () => {
  const response = await getClientUpdate({
    env: releaseEnv,
    params: { target: 'windows', arch: 'x86_64', currentVersion: '0.9.0' },
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(payload.version, '1.0.0');
  assert.equal(payload.signature, 'signed-update');
  assert.equal(payload.url, releaseEnv.DESKTOP_RELEASE_UPDATE_URL);
});
