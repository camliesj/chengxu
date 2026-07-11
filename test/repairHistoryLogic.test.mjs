import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterHistoryOrders,
  isHistoryOrder,
  isReceptionOrder,
  paginateRows,
} from '../src/repairHistoryLogic.js';

test('settled orders are history-only', () => {
  const settled = { status: '已结算' };
  assert.equal(isReceptionOrder(settled), false);
  assert.equal(isHistoryOrder(settled), true);
});

test('unsettled orders are reception-only', () => {
  for (const status of ['在修中', '已完工', '待结算']) {
    assert.equal(isReceptionOrder({ status }), true);
    assert.equal(isHistoryOrder({ status }), false);
  }
});

test('history filters compose across settlement date and business fields', () => {
  const orders = [
    {
      id: 'RO1', status: '已结算', settlementDate: '2026-07-10', date: '07-08', plate: '蒙K-12345',
      customer: '张先生', phone: '15100000000', insurer: '人保财险', type: '标的车', staff: '张工',
    },
    {
      id: 'RO2', status: '已结算', settlementDate: '2026-07-11', date: '07-09', plate: '蒙K-99999',
      customer: '李女士', phone: '15200000000', insurer: '平安保险', type: '三者车', staff: '王工',
    },
  ];
  const results = filterHistoryOrders(orders, {
    startDate: '2026-07-10', endDate: '2026-07-10', plate: '123', customer: '张', phone: '151',
    insurer: '人保财险', type: '标的车', staff: '张工',
  });
  assert.deepEqual(results.map((order) => order.id), ['RO1']);
});

test('pagination clamps to the available page range', () => {
  const result = paginateRows([1, 2, 3], 9, 2);
  assert.deepEqual(result.rows, [3]);
  assert.equal(result.page, 2);
  assert.equal(result.pageCount, 2);
});
