import test from 'node:test';
import assert from 'node:assert/strict';
import { findLegacyImportCandidates } from '../src/cloudRecordLogic.js';

test('legacy import includes only the current company and skips cloud IDs', () => {
  const local = [
    { id: 'IP1', companyId: 'tongda', plate: '蒙A-1' },
    { id: 'IP2', companyId: 'xinqiheng', plate: '蒙A-2' },
    { id: 'IP3', companyId: 'tongda', plate: '蒙A-3' },
  ];
  const cloud = [{ id: 'IP3', companyId: 'tongda', plate: '云端记录' }];

  assert.deepEqual(
    findLegacyImportCandidates(local, cloud, 'tongda').map((record) => record.id),
    ['IP1'],
  );
});

test('legacy import ignores malformed records and duplicate local IDs', () => {
  const local = [
    null,
    { companyId: 'tongda' },
    { id: 'CV1', companyId: 'tongda' },
    { id: 'CV1', companyId: 'tongda' },
  ];

  assert.deepEqual(
    findLegacyImportCandidates(local, [], 'tongda').map((record) => record.id),
    ['CV1'],
  );
});
