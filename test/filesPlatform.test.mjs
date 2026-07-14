import test from 'node:test';
import assert from 'node:assert/strict';
import {
  openExternal,
  printCurrentDocument,
  saveBytes,
} from '../src/platform/files.js';

test('web save creates an object URL and clicks a download anchor', async () => {
  const actions = [];
  const anchor = {
    click: () => actions.push('click'),
    remove: () => actions.push('remove'),
  };
  const documentLike = {
    body: { appendChild: (element) => actions.push(element === anchor ? 'append' : 'wrong-element') },
    createElement: (tagName) => {
      assert.equal(tagName, 'a');
      return anchor;
    },
  };
  const urlLike = {
    createObjectURL: (blob) => {
      assert.equal(blob instanceof Blob, true);
      actions.push('create-url');
      return 'blob:test-download';
    },
    revokeObjectURL: (url) => actions.push(`revoke:${url}`),
  };

  const result = await saveBytes({
    suggestedName: 'report.xls',
    bytes: new Uint8Array([1, 2, 3]),
    filters: [{ name: 'Excel', extensions: ['xls'] }],
  }, { desktop: false, documentLike, urlLike });

  assert.deepEqual(result, { saved: true });
  assert.equal(anchor.href, 'blob:test-download');
  assert.equal(anchor.download, 'report.xls');
  assert.deepEqual(actions, ['create-url', 'append', 'click', 'remove', 'revoke:blob:test-download']);
});

test('canceling the desktop save dialog does not write a file', async () => {
  let writeCount = 0;
  const result = await saveBytes({
    suggestedName: 'report.xls',
    bytes: new Uint8Array([1, 2, 3]),
    filters: [{ name: 'Excel', extensions: ['xls'] }],
  }, {
    desktop: true,
    loadDesktopModules: async () => ({
      save: async () => null,
      writeFile: async () => { writeCount += 1; },
    }),
  });

  assert.deepEqual(result, { saved: false });
  assert.equal(writeCount, 0);
});

test('desktop save writes bytes to the selected path', async () => {
  const writes = [];
  const bytes = new Uint8Array([4, 5, 6]);
  const result = await saveBytes({
    suggestedName: 'report.xls',
    bytes,
    filters: [{ name: 'Excel', extensions: ['xls'] }],
  }, {
    desktop: true,
    loadDesktopModules: async () => ({
      save: async (options) => {
        assert.deepEqual(options, {
          defaultPath: 'report.xls',
          filters: [{ name: 'Excel', extensions: ['xls'] }],
        });
        return 'C:\\Reports\\report.xls';
      },
      writeFile: async (path, value) => writes.push([path, value]),
    }),
  });

  assert.deepEqual(result, { saved: true, path: 'C:\\Reports\\report.xls' });
  assert.deepEqual(writes, [['C:\\Reports\\report.xls', bytes]]);
});

test('openExternal rejects non-HTTPS links before opening them', async () => {
  let openCount = 0;

  await assert.rejects(
    () => openExternal('http://example.com/client.exe', {
      desktop: false,
      windowLike: { open: () => { openCount += 1; } },
    }),
    /HTTPS/,
  );
  assert.equal(openCount, 0);
});

test('web external links open in a protected new tab', async () => {
  const calls = [];
  await openExternal('https://example.com/client.exe', {
    desktop: false,
    windowLike: { open: (...args) => calls.push(args) },
  });

  assert.deepEqual(calls, [['https://example.com/client.exe', '_blank', 'noopener,noreferrer']]);
});

test('printing waits for the template render before opening the dialog', async () => {
  const actions = [];
  await printCurrentDocument({
    waitForRender: async () => actions.push('rendered'),
    windowLike: { print: () => actions.push('printed') },
  });

  assert.deepEqual(actions, ['rendered', 'printed']);
});
