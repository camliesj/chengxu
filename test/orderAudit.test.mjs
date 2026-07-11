import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderAuditEvent, protectArchiveEdit, settledEditAccessError } from '../functions/_shared/order-audit.js';

test('order edit describes changed business fields', () => {
  const event = buildOrderAuditEvent(
    { id: 'RO1', status: '已结算', plate: '蒙K12345', material: 500, staff: '王工' },
    { id: 'RO1', status: '已结算', plate: '蒙K12345', material: 680, staff: '张工' },
  );
  assert.equal(event.action, 'update_order');
  assert.match(event.summary, /材料费.*500.*680/);
  assert.match(event.summary, /业务员.*王工.*张工/);
});

test('unchanged saves create no audit event', () => {
  const order = { id: 'RO1', status: '已结算', plate: '蒙K12345' };
  assert.equal(buildOrderAuditEvent(order, { ...order }), null);
});

test('settlement and reverse settlement have business actions', () => {
  assert.equal(buildOrderAuditEvent({ status: '待结算' }, { status: '已结算' }).action, 'settle_order');
  assert.equal(buildOrderAuditEvent({ status: '已结算' }, { status: '待结算' }).action, 'reverse_settlement');
});

test('archive edit preserves protected settlement fields', () => {
  const existing = {
    status: '已结算', payment_method: '微信', settlement_date: '2026-07-11', settlement_time: '10:30',
    settlement_receipt_key: 'receipt-key',
  };
  const incoming = {
    status: '在修中', payment_method: '现金', settlement_date: '', settlement_time: '', settlement_receipt_key: '',
  };
  const protectedOrder = protectArchiveEdit(incoming, existing);
  assert.equal(protectedOrder.status, '已结算');
  assert.equal(protectedOrder.payment_method, '微信');
  assert.equal(protectedOrder.settlement_receipt_key, 'receipt-key');
});

test('staff cannot edit an already settled order through the generic endpoint', () => {
  assert.equal(settledEditAccessError({ status: '已结算' }, 'staff'), 'ARCHIVE_EDIT_ADMIN_REQUIRED');
  assert.equal(settledEditAccessError({ status: '已结算' }, 'admin'), '');
  assert.equal(settledEditAccessError({ status: '待结算' }, 'staff'), '');
});
