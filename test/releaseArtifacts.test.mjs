import test from 'node:test';
import assert from 'node:assert/strict';
import {
  releaseArtifactKey,
  releaseDownloadPath,
  validateReleaseArtifact,
} from '../functions/_shared/release-artifacts.js';
import { onRequestPost as uploadReleaseArtifact } from '../functions/api/release-artifacts.js';
import { onRequestGet as downloadReleaseArtifact } from '../functions/api/client-downloads/windows/[version]/[fileName].js';

const installerName = '汽修接待与车辆保险管理_0.1.1_x64-setup.exe';
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

test('Windows release artifacts use a version-scoped COS key', () => {
  assert.equal(
    releaseArtifactKey('0.1.1', '汽修接待与车辆保险管理_0.1.1_x64-setup.exe'),
    'releases/windows/0.1.1/chengxu_0.1.1_x64-setup.exe',
  );
});

test('release download path safely encodes the installer name', () => {
  assert.equal(
    releaseDownloadPath('0.1.1', '汽修接待与车辆保险管理_0.1.1_x64-setup.exe'),
    '/api/client-downloads/windows/0.1.1/%E6%B1%BD%E4%BF%AE%E6%8E%A5%E5%BE%85%E4%B8%8E%E8%BD%A6%E8%BE%86%E4%BF%9D%E9%99%A9%E7%AE%A1%E7%90%86_0.1.1_x64-setup.exe',
  );
});

test('release artifacts reject unsafe versions, paths and file types', () => {
  assert.throws(() => validateReleaseArtifact('../0.1.1', 'setup.exe'), /INVALID_RELEASE_VERSION/);
  assert.throws(() => validateReleaseArtifact('0.1.1', '../setup.exe'), /INVALID_RELEASE_FILE/);
  assert.throws(() => validateReleaseArtifact('0.1.1', 'setup.zip'), /INVALID_RELEASE_FILE/);
});

test('only an administrator can upload a Windows installer', async () => {
  const request = new Request('https://chengxu.pages.dev/api/release-artifacts', {
    method: 'POST',
    headers: {
      authorization: 'Bearer session',
      'content-type': 'application/octet-stream',
      'x-release-version': '0.1.1',
      'x-file-name': encodeURIComponent(installerName),
    },
    body: new Uint8Array([1, 2, 3]),
  });

  const denied = await uploadReleaseArtifact({ request, env: { ...cosEnv, DB: sessionDb('staff') } });
  assert.equal(denied.status, 403);

  const originalFetch = globalThis.fetch;
  let uploadedUrl = '';
  globalThis.fetch = async (url) => {
    uploadedUrl = String(url);
    return new Response(null, { status: 200 });
  };
  try {
    const response = await uploadReleaseArtifact({ request, env: { ...cosEnv, DB: sessionDb() } });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.size, 3);
    assert.match(payload.downloadUrl, /client-downloads\/windows\/0\.1\.1/);
    assert.match(uploadedUrl, /releases\/windows\/0\.1\.1\/chengxu_0\.1\.1_x64-setup\.exe/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('public release download streams the private COS object', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array([7, 8, 9]), {
    status: 200,
    headers: { 'content-length': '3' },
  });
  try {
    const response = await downloadReleaseArtifact({
      env: cosEnv,
      params: { version: '0.1.1', fileName: installerName },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-length'), '3');
    assert.match(response.headers.get('content-disposition'), /filename\*=UTF-8''/);
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [7, 8, 9]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
