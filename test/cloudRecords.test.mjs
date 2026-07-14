import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCloudRecord, parseCloudRows } from '../functions/_shared/cloud-records.js';

test('server forces the authenticated company onto stored JSON', () => {
  assert.deepEqual(
    normalizeCloudRecord({ id: 'IP1', companyId: 'wrong', plate: '蒙A-1' }, 'tongda'),
    { id: 'IP1', companyId: 'tongda', plate: '蒙A-1' },
  );
});

test('server rejects cloud records without an ID', () => {
  assert.throws(() => normalizeCloudRecord({ plate: '蒙A-1' }, 'tongda'), /RECORD_ID_REQUIRED/);
});

test('invalid JSON rows are ignored without breaking the full list', () => {
  assert.deepEqual(parseCloudRows([
    { record_json: '{"id":"IP1"}' },
    { record_json: '{broken' },
  ]), [{ id: 'IP1' }]);
});
