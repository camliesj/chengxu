import test from 'node:test';
import assert from 'node:assert/strict';
import { auditActionLabel, formatAuditTime, groupAuditLogs } from '../src/auditLogLogic.js';

test('D1 UTC timestamp displays in Shanghai time', () => {
  assert.equal(formatAuditTime('2026-07-11 02:30:00'), '2026-07-11 10:30:00');
});

test('legacy steps for one target collapse within five seconds', () => {
  const groups = groupAuditLogs([
    { id: 2, target_id: 'RO1', label: '管理员', action: 'settle_order', created_at: '2026-07-11 02:30:02' },
    { id: 1, target_id: 'RO1', label: '管理员', action: 'upload_receipt', created_at: '2026-07-11 02:30:00' },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].steps.length, 2);
  assert.equal(groups[0].action, 'settle_order');
});

test('new event identifiers group exact business steps', () => {
  const groups = groupAuditLogs([
    { id: 3, event_id: 'evt-1', target_id: 'RO1', label: '管理员', action: 'settle_order', created_at: '2026-07-11 02:30:02' },
    { id: 2, event_id: 'evt-1', target_id: 'RO1', label: '管理员', action: 'upload_receipt', created_at: '2026-07-11 02:20:00' },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].steps.length, 2);
});

test('technical action codes have readable labels', () => {
  assert.equal(auditActionLabel('reverse_settlement'), '返结算');
  assert.equal(auditActionLabel('upload_receipt'), '上传到账回执');
});
