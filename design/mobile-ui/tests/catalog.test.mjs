import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREEN_CATALOG } from '../src/screen-catalog.js';

const required = [
  'login-company',
  'workbench-employee',
  'workbench-admin',
  'orders-current',
  'orders-filter-sheet',
  'order-detail-employee',
  'order-detail-admin',
  'order-create-customer',
  'order-create-insurance',
  'order-create-repair',
  'order-create-review',
  'order-edit',
  'order-status-dialog',
  'order-settlement',
  'receipt-upload',
  'reverse-settlement-dialog',
  'records-customers',
  'records-insurance',
  'records-history',
  'profile-sync',
  'offline-readonly',
  'states-gallery',
];

test('mobile UI catalog contains every approved screen exactly once', () => {
  assert.equal(SCREEN_CATALOG.length, 22);
  assert.deepEqual(
    [...new Set(SCREEN_CATALOG.map(({ id }) => id))],
    required,
  );
});

test('every catalog entry has review metadata', () => {
  for (const screen of SCREEN_CATALOG) {
    assert.match(screen.label, /\S/);
    assert.ok(
      ['auth', 'workbench', 'orders', 'forms', 'records', 'system'].includes(
        screen.group,
      ),
    );
    assert.ok(['all', 'employee', 'admin'].includes(screen.role));
  }
});

test('catalog labels preserve approved Chinese copy', () => {
  assert.equal(SCREEN_CATALOG[0].label, '登录与公司选择');
  assert.equal(
    SCREEN_CATALOG.find(({ id }) => id === 'states-gallery')?.label,
    '系统状态合集',
  );
});
