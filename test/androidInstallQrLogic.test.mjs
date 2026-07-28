import test from 'node:test';
import assert from 'node:assert/strict';
import { androidInstallQrState } from '../src/clientReleaseLogic.js';

const downloadUrl = 'https://chengxu.pages.dev/api/client-downloads/android/0.1.0/zhiwei-car-service_0.1.0.apk';

test('Android QR state is ready only for an available HTTPS APK release', () => {
  assert.deepEqual(
    androidInstallQrState({
      android: {
        available: true,
        version: '0.1.0',
        size: '20 MB',
        downloadUrl,
      },
    }),
    {
      status: 'ready',
      release: {
        platform: 'Android',
        available: true,
        version: '0.1.0',
        publishedAt: '',
        size: '20 MB',
        notes: '',
        downloadUrl,
        canDownload: true,
        actionLabel: '立即下载',
      },
    },
  );
});

test('Android QR state does not generate a code before release publication', () => {
  assert.deepEqual(androidInstallQrState({ android: { available: false } }), {
    status: 'unavailable',
    release: null,
  });
});

test('Android QR state exposes release-read errors without a code payload', () => {
  assert.deepEqual(androidInstallQrState({}, new Error('NETWORK')), {
    status: 'error',
    release: null,
  });
});

test('Android QR state refuses a non-HTTPS download URL', () => {
  assert.deepEqual(androidInstallQrState({
    android: { available: true, downloadUrl: 'http://unsafe.example/app.apk' },
  }), {
    status: 'unavailable',
    release: null,
  });
});
