import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeClientReleases } from '../src/clientReleaseLogic.js';
import { compareVersions } from '../functions/_shared/releases.js';

test('semantic versions compare numerically', () => {
  assert.equal(compareVersions('1.10.0', '1.9.9'), 1);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('0.9.9', '1.0.0'), -1);
});

test('published Windows release exposes download action', () => {
  const result = normalizeClientReleases({
    windows: {
      available: true,
      version: '1.0.0',
      downloadUrl: 'https://downloads.example.com/chengxu.exe',
    },
  });

  assert.equal(result.windows.actionLabel, '下载客户端');
  assert.equal(result.windows.canDownload, true);
});

test('unpublished Android renders as coming soon', () => {
  const result = normalizeClientReleases({
    windows: { available: true, version: '1.0.0' },
    android: { available: false },
  });

  assert.equal(result.android.actionLabel, '敬请期待');
  assert.equal(result.android.canDownload, false);
});

test('published Android uses installation copy and suppresses corrupted release notes', () => {
  const result = normalizeClientReleases({
    windows: { available: true, version: '1.0.0', downloadUrl: 'https://downloads.example.com/chengxu.exe' },
    android: {
      available: true,
      version: '0.1.0',
      downloadUrl: 'https://downloads.example.com/chengxu.apk',
      notes: '???? Android ???',
    },
  });

  assert.equal(result.windows.actionLabel, '下载客户端');
  assert.equal(result.android.actionLabel, '下载客户端');
  assert.equal(result.android.description, '扫码或下载 Android 安装包。');
  assert.equal(result.android.notes, '');
});
