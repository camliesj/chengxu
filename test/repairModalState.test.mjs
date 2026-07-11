import test from 'node:test';
import assert from 'node:assert/strict';
import { closedRepairModalState, openRepairModal } from '../src/repairModalState.js';

test('closing a repair modal clears its order target', () => {
  assert.deepEqual(closedRepairModalState(), { kind: 'closed', orderId: '' });
});

test('row selection alone has no modal-open state', () => {
  assert.equal(openRepairModal('detail', 'RO1').kind, 'detail');
  assert.deepEqual(closedRepairModalState(), { kind: 'closed', orderId: '' });
});
