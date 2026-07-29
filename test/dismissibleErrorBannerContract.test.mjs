import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('dismissible error banner exposes an accessible close action and expiry lifecycle', async () => {
  const source = await readFile(new URL('../src/components/DismissibleErrorBanner.jsx', import.meta.url), 'utf8');
  assert.match(source, /关闭错误提示/);
  assert.match(source, /TRANSIENT_ERROR_DURATION_MS/);
  assert.match(source, /onDismiss/);
});
