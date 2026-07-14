import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUpdateEvent } from '../src/updateLogic.js';
import {
  checkForDesktopUpdate,
  getDesktopVersion,
  installDesktopUpdate,
  relaunchDesktopApp,
} from '../src/platform/updater.js';

test('Started resets downloaded bytes and reads the total size', () => {
  const progress = normalizeUpdateEvent(
    { event: 'Started', data: { contentLength: 2048 } },
    { downloaded: 512, total: 1024, complete: true },
  );

  assert.deepEqual(progress, { downloaded: 0, total: 2048, complete: false });
});

test('Progress accumulates downloaded chunk lengths', () => {
  const progress = normalizeUpdateEvent(
    { event: 'Progress', data: { chunkLength: 384 } },
    { downloaded: 640, total: 2048, complete: false },
  );

  assert.deepEqual(progress, { downloaded: 1024, total: 2048, complete: false });
});

test('Finished marks the current download as complete', () => {
  const progress = normalizeUpdateEvent(
    { event: 'Finished' },
    { downloaded: 2048, total: 2048, complete: false },
  );

  assert.deepEqual(progress, { downloaded: 2048, total: 2048, complete: true });
});

test('web runtime reports no desktop update without importing Tauri modules', async () => {
  let appImports = 0;
  let updaterImports = 0;

  const version = await getDesktopVersion({
    desktop: false,
    loadAppModule: async () => {
      appImports += 1;
      return { getVersion: async () => '9.9.9' };
    },
  });
  const update = await checkForDesktopUpdate({
    desktop: false,
    loadUpdaterModule: async () => {
      updaterImports += 1;
      return { check: async () => ({ version: '9.9.9' }) };
    },
  });

  assert.equal(version, '');
  assert.equal(update, null);
  assert.equal(appImports, 0);
  assert.equal(updaterImports, 0);
});

test('desktop install forwards normalized download progress', async () => {
  const snapshots = [];
  const update = {
    downloadAndInstall: async (listener) => {
      listener({ event: 'Started', data: { contentLength: 100 } });
      listener({ event: 'Progress', data: { chunkLength: 40 } });
      listener({ event: 'Progress', data: { chunkLength: 60 } });
      listener({ event: 'Finished' });
    },
  };

  await installDesktopUpdate(update, (progress) => snapshots.push(progress), { desktop: true });

  assert.deepEqual(snapshots, [
    { downloaded: 0, total: 100, complete: false },
    { downloaded: 40, total: 100, complete: false },
    { downloaded: 100, total: 100, complete: false },
    { downloaded: 100, total: 100, complete: true },
  ]);
});

test('desktop relaunch delegates to the Tauri process plugin', async () => {
  let relaunchCount = 0;

  const relaunched = await relaunchDesktopApp({
    desktop: true,
    loadProcessModule: async () => ({
      relaunch: async () => { relaunchCount += 1; },
    }),
  });

  assert.equal(relaunched, true);
  assert.equal(relaunchCount, 1);
});
