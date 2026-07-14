import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

test('package exposes the Windows desktop commands', () => {
  const packageJson = readJson(new URL('../package.json', import.meta.url));

  assert.equal(packageJson.scripts['desktop:dev'], 'tauri dev');
  assert.equal(packageJson.scripts['desktop:check'], 'cargo check --manifest-path src-tauri/Cargo.toml');
  assert.equal(packageJson.scripts['desktop:build'], 'tauri build --bundles nsis');
});

test('Tauri config targets the Windows NSIS application shell', () => {
  const packageJson = readJson(new URL('../package.json', import.meta.url));
  const config = readJson(new URL('../src-tauri/tauri.conf.json', import.meta.url));
  const cargoToml = readFileSync(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8');
  const [window] = config.app.windows;

  assert.equal(config.productName, '汽修接待与车辆保险管理');
  assert.equal(config.version, '0.1.1');
  assert.equal(packageJson.version, config.version);
  assert.match(cargoToml, /^version = "0\.1\.1"$/m);
  assert.equal(config.identifier, 'com.chengxu.repairmanager');
  assert.equal(config.build.frontendDist, '../dist');
  assert.equal(config.build.devUrl, 'http://localhost:5173');
  assert.deepEqual(
    [window.width, window.height, window.minWidth, window.minHeight, window.maximized],
    [1440, 900, 1280, 720, true],
  );
  assert.deepEqual(config.bundle.targets, ['nsis']);
  assert.equal(config.bundle.windows.nsis.installMode, 'currentUser');
  assert.equal(config.bundle.createUpdaterArtifacts, true);
  assert.deepEqual(config.plugins.updater.endpoints, [
    'https://chengxu.pages.dev/api/client-updates/{{target}}/{{arch}}/{{current_version}}',
  ]);
  const decodedUpdaterPublicKey = Buffer.from(config.plugins.updater.pubkey, 'base64').toString('utf8');
  assert.match(decodedUpdaterPublicKey, /minisign public key/);
  assert.match(decodedUpdaterPublicKey, /\nRW[A-Za-z0-9+/=]+\n$/);
});

test('desktop capability stays cloud-scoped and grants no shell access', () => {
  const capability = readJson(new URL('../src-tauri/capabilities/default.json', import.meta.url));
  const serialized = JSON.stringify(capability);
  const httpPermission = capability.permissions.find((permission) => permission?.identifier === 'http:default');

  assert.deepEqual(capability.windows, ['main']);
  assert.deepEqual(httpPermission.allow, [{ url: 'https://chengxu.pages.dev/**' }]);
  assert.equal(serialized.includes('shell:'), false);
  assert.equal(capability.permissions.includes('dialog:allow-save'), true);
  assert.equal(capability.permissions.includes('fs:allow-write-file'), true);
  assert.equal(capability.permissions.includes('updater:default'), true);
  assert.equal(capability.permissions.includes('process:allow-restart'), true);
});

test('Rust shell registers required official plugins', () => {
  const cargoToml = readFileSync(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8');
  const rustShell = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');

  for (const plugin of ['http', 'dialog', 'fs', 'opener', 'process', 'updater', 'single-instance', 'window-state']) {
    assert.match(cargoToml, new RegExp(`tauri-plugin-${plugin}`));
  }
  assert.match(rustShell, /get_webview_window\("main"\)/);
  assert.match(rustShell, /set_focus\(\)/);
});
