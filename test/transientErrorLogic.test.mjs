import test from 'node:test';
import assert from 'node:assert/strict';

import { createTransientError, isTransientErrorVisible } from '../src/transientErrorLogic.js';

test('a transient error expires after eight seconds', () => {
  const notice = createTransientError('云端刷新失败', 1000);
  assert.equal(isTransientErrorVisible(notice, 8999), true);
  assert.equal(isTransientErrorVisible(notice, 9000), false);
});

test('an empty error never creates a visible notice', () => {
  assert.equal(createTransientError('', 1000), null);
  assert.equal(isTransientErrorVisible(null, 1001), false);
});
