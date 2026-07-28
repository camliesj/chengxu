import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

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
