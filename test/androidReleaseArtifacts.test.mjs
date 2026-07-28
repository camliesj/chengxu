import test from 'node:test';
import assert from 'node:assert/strict';
import {
  releaseArtifactKey,
  releaseDownloadPath,
  validateReleaseArtifact,
} from '../functions/_shared/release-artifacts.js';
import { onRequestPost as uploadReleaseArtifact } from '../functions/api/release-artifacts.js';
import { onRequestGet as downloadAndroidReleaseArtifact } from '../functions/api/client-downloads/android/[version]/[fileName].js';
import { onRequestGet as getClientReleases } from '../functions/api/client-releases.js';

const androidPackageName = 'zhiwei-car-service_0.1.0.apk';
const cosEnv = {
  TENCENT_SECRET_ID: 'test-id',
  TENCENT_SECRET_KEY: 'test-key',
  COS_BUCKET: 'test-bucket-123',
  COS_REGION: 'ap-guangzhou',
};

function sessionDb(role = 'admin') {
  return {
    prepare() {
      return {
        bind() {
          return { first: async () => ({ role, company_id: 'tongda', token: 'session' }) };
        },
      };
    },
  };
}

test('Android release artifacts use a platform-scoped COS key and download path', () => {
  assert.equal(
    releaseArtifactKey('android', '0.1.0', androidPackageName),
    'releases/android/0.1.0/zhiwei-car-service_0.1.0.apk',
  );
  assert.equal(
    releaseDownloadPath('android', '0.1.0', androidPackageName),
    '/api/client-downloads/android/0.1.0/zhiwei-car-service_0.1.0.apk',
  );
  assert.throws(() => validateReleaseArtifact('android', '0.1.0', '../evil.apk'), /INVALID_RELEASE_FILE/);
  assert.throws(() => validateReleaseArtifact('android', '0.1.0', 'setup.exe'), /INVALID_RELEASE_FILE/);
  assert.throws(() => validateReleaseArtifact('ios', '0.1.0', androidPackageName), /INVALID_RELEASE_PLATFORM/);
});

test('administrator can upload and the public Android route streams an APK', async () => {
  const request = new Request('https://chengxu.pages.dev/api/release-artifacts', {
    method: 'POST',
    headers: {
      authorization: 'Bearer session',
      'content-type': 'application/vnd.android.package-archive',
      'x-release-platform': 'android',
      'x-release-version': '0.1.0',
      'x-file-name': androidPackageName,
    },
    body: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
  });

  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    return new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
      status: 200,
      headers: { 'content-length': '4' },
    });
  };
  try {
    const uploaded = await uploadReleaseArtifact({ request, env: { ...cosEnv, DB: sessionDb() } });
    const uploadPayload = await uploaded.json();
    assert.equal(uploaded.status, 200);
    assert.equal(uploadPayload.size, 4);
    assert.equal(uploadPayload.downloadUrl, 'https://chengxu.pages.dev/api/client-downloads/android/0.1.0/zhiwei-car-service_0.1.0.apk');

    const downloaded = await downloadAndroidReleaseArtifact({
      env: cosEnv,
      params: { version: '0.1.0', fileName: androidPackageName },
    });
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.headers.get('content-type'), 'application/vnd.android.package-archive');
    assert.match(downloaded.headers.get('content-disposition'), /zhiwei-car-service_0.1.0\.apk/);
    assert.deepEqual([...new Uint8Array(await downloaded.arrayBuffer())], [0x50, 0x4b, 0x03, 0x04]);
    assert.ok(requestedUrls.some((url) => url.includes('releases/android/0.1.0/zhiwei-car-service_0.1.0.apk')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Android artifact upload rejects an unrelated content type', async () => {
  const request = new Request('https://chengxu.pages.dev/api/release-artifacts', {
    method: 'POST',
    headers: {
      authorization: 'Bearer session',
      'content-type': 'image/png',
      'x-release-platform': 'android',
      'x-release-version': '0.1.0',
      'x-file-name': androidPackageName,
    },
    body: new Uint8Array([1]),
  });

  const response = await uploadReleaseArtifact({ request, env: { ...cosEnv, DB: sessionDb() } });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'INVALID_RELEASE_CONTENT_TYPE' });
});

test('public release metadata exposes a configured Android APK', async () => {
  const response = await getClientReleases({
    env: {
      ANDROID_RELEASE_VERSION: '0.1.0',
      ANDROID_RELEASE_PUBLISHED_AT: '2026-07-28T08:00:00Z',
      ANDROID_RELEASE_SIZE: '20 MB',
      ANDROID_RELEASE_NOTES: 'Mobile release',
      ANDROID_RELEASE_DOWNLOAD_URL: 'https://chengxu.pages.dev/api/client-downloads/android/0.1.0/zhiwei-car-service_0.1.0.apk',
    },
  });
  const payload = await response.json();
  assert.equal(payload.android.available, true);
  assert.equal(payload.android.version, '0.1.0');
  assert.match(payload.android.downloadUrl, /client-downloads\/android\/0\.1\.0/);
});
