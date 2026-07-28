import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const api = await import('../src/settlementApi.js').catch((error) => ({ loadError: error }));

test('web settlement posts the versioned command and uses the server order', async () => {
  let request;
  const result = await api.settleOrderCommand('RO-1', {
    operationId: '44444444-4444-4444-8444-444444444444', expectedVersion: 4,
    paymentMethod: '现金', settlementDate: '2026-07-28', settlementTime: '10:30', settlementRemark: '到账',
    receipt: { key: 'receipts/tongda/2026/RO-1.png', name: 'receipt.png', contentType: 'image/png', sizeBytes: 128, uploadedAt: '2026-07-28T02:30:00.000Z' },
  }, { token: 'secret' }, {
    fetcher: async (path, init) => {
      request = { path, init };
      return response(200, { order: { id: 'RO-1', version: 5, status: '已结算' } });
    },
  });
  assert.equal(request.path, '/api/orders/RO-1/settlement');
  assert.equal(request.init.headers.authorization, 'Bearer secret');
  assert.equal(JSON.parse(request.init.body).expectedVersion, 4);
  assert.equal(result.kind, 'success');
  assert.equal(result.value.order.version, 5);
});

test('web reverse and receipt commands preserve explicit conflict and unknown-result states', async () => {
  const command = { operationId: '55555555-5555-4555-8555-555555555555', expectedVersion: 5 };
  const reverse = await api.reverseSettlementCommand('RO-1', command, {}, {
    fetcher: async (path) => {
      assert.equal(path, '/api/orders/RO-1/reverse-settlement');
      return response(409, { error: 'ORDER_SETTLEMENT_CONFLICT', order: { id: 'RO-1', version: 6 } });
    },
  });
  assert.equal(reverse.kind, 'conflict');
  const receipt = await api.updateOrderReceiptCommand('RO-1', { ...command, receipt: null }, {}, {
    fetcher: async () => response(409, { error: 'OPERATION_IN_PROGRESS' }),
  });
  assert.equal(receipt.kind, 'unknownResult');
});

test('web reception and history route settlement mutations through versioned callbacks', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /onSettlement=\{saveSettlement\}/u);
  assert.match(source, /onReverseSettlement=\{reverseSettlement\}/u);
  assert.match(source, /await settleOrderCommand\(order\.id,/u);
  assert.match(source, /await reverseSettlementCommand\(order\.id,/u);
});

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, async json() { return structuredClone(body); } };
}
