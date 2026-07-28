import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

const readText = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('智纬 visible brand and launcher resources are installed across platforms', () => {
  assert.match(readText('../index.html'), /智纬/);
  assert.match(readText('../src-tauri/tauri.conf.json'), /智纬/);
  assert.match(readText('../android-client/app/src/main/res/values/strings.xml'), /智纬/);
  assert.match(readText('../android-client/app/src/main/AndroidManifest.xml'), /android:icon="@mipmap\/ic_launcher"/);
  assert.match(readText('../android-client/app/src/main/AndroidManifest.xml'), /android:roundIcon="@mipmap\/ic_launcher_round"/);
  assert.equal(existsSync(new URL('../public/brand/zhiwei-car-service-icon.png', import.meta.url)), true);
  assert.equal(existsSync(new URL('../public/favicon.png', import.meta.url)), true);
});

test('login uses the shared background and keeps Android QR inside client downloads', () => {
  const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8');
  const downloads = readFileSync(resolve(root, 'src/components/ClientDownloadsDialog.jsx'), 'utf8');
  const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
  assert.ok(statSync(resolve(root, 'public/brand/zhiwei-login-background.png')).size > 10_000);
  assert.match(css, /zhiwei-login-background\.png/);
  assert.doesNotMatch(app, /AndroidInstallQr/);
  assert.match(downloads, /QRCodeSVG/);
  assert.match(downloads, /release\.canDownload/);
});
