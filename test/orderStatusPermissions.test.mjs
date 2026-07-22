import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  EMPLOYEE_EDITABLE_STATUSES,
  ORDINARY_ORDER_STATUSES,
  allowedStatusTargets,
  canEmployeeSetOrderStatus,
  canTransitionOrderStatus,
} from '../shared/orderStatusPermissions.js';
import { validateSettlementPermission } from '../functions/api/orders.js';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const statusContract = JSON.parse(await readFile(
  new URL('../contracts/order-status-v1.json', import.meta.url),
  'utf8',
));

test('canonical ordinary status contract locks targets and staff edges', () => {
  assert.equal(statusContract.version, 1);
  assert.deepEqual(statusContract.targets, ORDINARY_ORDER_STATUSES);
  assert.deepEqual(statusContract.transitions.staff, [
    { from: '在修中', to: '已完工' },
    { from: '已完工', to: '待结算' },
  ]);
  assert.equal(statusContract.targets.includes('已结算'), false);
});

test('canonical helpers match every allowed and forbidden status fixture', () => {
  for (const transition of statusContract.allowedCases) {
    assert.equal(
      canTransitionOrderStatus(transition.role, transition.from, transition.to),
      true,
      transition.name,
    );
    assert.ok(allowedStatusTargets(transition.role, transition.from).includes(transition.to));
  }
  for (const transition of statusContract.forbiddenCases) {
    assert.equal(
      canTransitionOrderStatus(transition.role, transition.from, transition.to),
      false,
      transition.name,
    );
    assert.equal(allowedStatusTargets(transition.role, transition.from).includes(transition.to), false);
  }
});

test('employees can move work orders through every pre-settlement status', () => {
  assert.deepEqual(EMPLOYEE_EDITABLE_STATUSES, ['在修中', '已完工', '待结算']);
  for (const status of EMPLOYEE_EDITABLE_STATUSES) {
    assert.equal(canEmployeeSetOrderStatus(status), true);
  }
});

test('employees cannot settle or reverse a settled work order', () => {
  assert.equal(canEmployeeSetOrderStatus('已结算'), false);
});

test('employee status transitions are adjacent and forward only', () => {
  assert.equal(canTransitionOrderStatus('staff', '在修中', '已完工'), true);
  assert.equal(canTransitionOrderStatus('staff', '已完工', '待结算'), true);
  assert.equal(canTransitionOrderStatus('staff', '在修中', '待结算'), false);
  assert.equal(canTransitionOrderStatus('staff', '已完工', '在修中'), false);
  assert.equal(canTransitionOrderStatus('staff', '待结算', '已结算'), false);
});

test('administrator can move one adjacent step backward inside ordinary statuses', () => {
  assert.equal(canTransitionOrderStatus('admin', '已完工', '在修中'), true);
  assert.equal(canTransitionOrderStatus('admin', '待结算', '已完工'), true);
  assert.equal(canTransitionOrderStatus('admin', '待结算', '在修中'), false);
  assert.equal(canTransitionOrderStatus('admin', '已结算', '待结算'), false);
});

test('orders API allows staff to mark pending settlement but rejects settlement', () => {
  const staff = { role: 'staff' };
  assert.equal(
    validateSettlementPermission({ status: '待结算' }, { status: '已完工' }, staff),
    '',
  );
  assert.equal(
    validateSettlementPermission({ status: '已结算' }, { status: '待结算' }, staff),
    'SETTLEMENT_ADMIN_REQUIRED',
  );
});

test('repair UI exposes pending settlement to staff but gates settlement actions', () => {
  assert.match(appSource, /<button[\s\S]{0,200}requestStatusChange\(selected, REPAIR_STATUS\.pendingSettlement\)[\s\S]{0,120}待结算/);
  assert.match(appSource, /canSettleOrder && selected\.status !== REPAIR_STATUS\.settled/);
  assert.match(appSource, /canSettleOrder && selected\.status === REPAIR_STATUS\.settled/);
});
