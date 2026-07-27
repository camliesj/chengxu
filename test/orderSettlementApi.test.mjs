import assert from 'node:assert/strict';
import test from 'node:test';

const moduleUnderTest = await import('../functions/_shared/order-settlement.js')
  .catch((error) => ({ loadError: error }));
const settlementRoute = await import('../functions/api/orders/[id]/settlement.js')
  .catch((error) => ({ loadError: error }));
const reverseRoute = await import('../functions/api/orders/[id]/reverse-settlement.js')
  .catch((error) => ({ loadError: error }));
const receiptRoute = await import('../functions/api/orders/[id]/receipt.js')
  .catch((error) => ({ loadError: error }));
const settlementOperationRoute = await import('../functions/api/order-operations/settle-order/[operationId].js')
  .catch((error) => ({ loadError: error }));
const operationId = '3f1ef08c-1136-44af-8823-cc92b9b0da01';
const reverseOperationId = '3f1ef08c-1136-44af-8823-cc92b9b0da02';
const receiptOperationId = '3f1ef08c-1136-44af-8823-cc92b9b0da03';

test('settlement contract exposes versioned settlement, reversal, and receipt commands', () => {
  assert.equal(typeof moduleUnderTest.handleSettlementCommand, 'function');
  assert.equal(typeof moduleUnderTest.handleReverseSettlementCommand, 'function');
  assert.equal(typeof moduleUnderTest.handleReceiptCommand, 'function');
  assert.equal(typeof moduleUnderTest.readSettlementOperation, 'function');
});

test('settlement routes reject unauthenticated writes and operation reads before database access', async () => {
  const env = { DB: { prepare() { throw new Error('database must not be queried'); } } };
  const request = new Request('https://example.test/api/orders/RO-1/settlement', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
  });
  for (const route of [settlementRoute, reverseRoute, receiptRoute]) {
    assert.equal(typeof route.onRequestPost, 'function');
    const response = await route.onRequestPost({ request, env, params: { id: 'RO-1' } });
    assert.equal(response.status, 401);
  }
  assert.equal(typeof settlementOperationRoute.onRequestGet, 'function');
  const query = await settlementOperationRoute.onRequestGet({
    request: new Request('https://example.test/api/order-operations/settle-order/x'),
    env, params: { operationId },
  });
  assert.equal(query.status, 401);
});

test('settlement rejects a missing independent capability before an operation is claimed', async () => {
  const response = await moduleUnderTest.handleSettlementCommand({
    env: commandEnvironment({ capabilities: ['SETTLE_ORDER'] }),
    session: adminSession(), orderId: 'RO-1', payload: settlementPayload(),
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'CAPABILITY_DISABLED' });
});

test('settlement atomically writes payment and receipt metadata while reverse retains the receipt', async () => {
  const env = commandEnvironment({ capabilities: ['SETTLE_ORDER', 'MAINTAIN_RECEIPT', 'REVERSE_SETTLEMENT'] });
  const settled = await moduleUnderTest.handleSettlementCommand({
    env, session: adminSession(), orderId: 'RO-1', payload: settlementPayload(),
  });

  assert.equal(settled.status, 200);
  assert.equal((await settled.json()).order.status, '已结算');
  assert.equal(env.state.row.payment_method, '现金');
  assert.equal(env.state.row.settlement_receipt_key, 'receipts/tongda/2026/RO-1.png');
  assert.equal(env.state.row.version, 5);
  assert.deepEqual(env.state.batchKinds, ['audit-sentinel', 'order-update', 'operation-complete']);

  const reversed = await moduleUnderTest.handleReverseSettlementCommand({
    env, session: adminSession(), orderId: 'RO-1', payload: {
      operationId: reverseOperationId, expectedVersion: 5,
    },
  });

  assert.equal(reversed.status, 200);
  const body = await reversed.json();
  assert.equal(body.order.status, '待结算');
  assert.equal(body.order.paymentMethod, '待确认');
  assert.equal(body.order.settlementDate, '');
  assert.equal(body.order.receipt.name, 'receipt.png');
  assert.equal(env.state.row.settlement_receipt_key, 'receipts/tongda/2026/RO-1.png');
});

test('receipt metadata clear is versioned and does not alter a settled order', async () => {
  const env = commandEnvironment({
    status: '已结算',
    capabilities: ['MAINTAIN_RECEIPT'],
    receipt: receiptMetadata(),
  });
  const response = await moduleUnderTest.handleReceiptCommand({
    env, session: adminSession(), orderId: 'RO-1', payload: {
      operationId: receiptOperationId, expectedVersion: 4, receipt: null,
    },
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.order.status, '已结算');
  assert.equal(body.order.receipt, null);
  assert.equal(env.state.row.settlement_receipt_key, '');
  assert.equal(env.state.row.version, 5);
});

function adminSession() {
  return {
    role: 'admin', label: 'manager', username: 'manager', company_id: 'tongda', permissions: '["repair"]',
  };
}

function settlementPayload() {
  return {
    operationId,
    expectedVersion: 4,
    paymentMethod: '现金',
    settlementDate: '2026-07-27',
    settlementTime: '18:29',
    settlementRemark: '已到账',
    receipt: receiptMetadata(),
  };
}

function receiptMetadata() {
  return {
    key: 'receipts/tongda/2026/RO-1.png',
    name: 'receipt.png',
    contentType: 'image/png',
    sizeBytes: 128,
    uploadedAt: '2026-07-27T10:29:00.000Z',
  };
}

function commandEnvironment({
  status = '待结算',
  capabilities = [],
  receipt = null,
}) {
  const row = {
    id: 'RO-1', company_id: 'tongda', version: 4, status, voided: 0,
    updated_at: '2026-07-27 10:00:00', plate: 'A1', customer: 'C', phone: '', car: '', insurer: '',
    insurance_expiry: '', type: '', labor: 100, material: 20, amount: 120, record: '', staff: '', delivery: '',
    vin: '', claim_no: '', accident_type: '', payment_method: status === '已结算' ? '现金' : '待确认', remark: '',
    settlement_date: status === '已结算' ? '2026-07-27' : '', settlement_time: status === '已结算' ? '18:29' : '',
    settlement_remark: status === '已结算' ? '已到账' : '',
    settlement_receipt_key: receipt?.key || '', settlement_receipt_name: receipt?.name || '',
    settlement_receipt_type: receipt?.contentType || '', settlement_receipt_size: receipt?.sizeBytes || 0,
    settlement_receipt_uploaded_at: receipt?.uploadedAt || '',
  };
  const operations = new Map();
  const state = { row, operations, operation: null, auditRows: [], batchKinds: [] };
  const DB = {
    prepare(sql) { return statement(sql, []); },
    async batch(statements) {
      state.batchKinds = statements.map((statement) => (
        statement.sql.includes('-- settlement-audit') ? 'audit-sentinel'
          : statement.sql.includes('-- settlement-update') ? 'order-update' : 'operation-complete'
      ));
      const audit = statements[0];
      state.auditRows.push({ eventId: audit.values[3] });
      const update = statements[1];
      if (update.sql.includes('-- settle-order-update')) {
        const [nextStatus, paymentMethod, settlementDate, settlementTime, settlementRemark,
          key, name, contentType, sizeBytes, uploadedAt, updatedAt] = update.values;
        state.row = {
          ...state.row, status: nextStatus, payment_method: paymentMethod, settlement_date: settlementDate,
          settlement_time: settlementTime, settlement_remark: settlementRemark, settlement_receipt_key: key,
          settlement_receipt_name: name, settlement_receipt_type: contentType, settlement_receipt_size: sizeBytes,
          settlement_receipt_uploaded_at: uploadedAt, updated_at: updatedAt, version: state.row.version + 1,
        };
      } else if (update.sql.includes('-- reverse-settlement-update')) {
        const [nextStatus, paymentMethod, settlementDate, settlementTime, settlementRemark, updatedAt] = update.values;
        state.row = {
          ...state.row, status: nextStatus, payment_method: paymentMethod, settlement_date: settlementDate,
          settlement_time: settlementTime, settlement_remark: settlementRemark, updated_at: updatedAt,
          version: state.row.version + 1,
        };
      } else {
        const [key, name, contentType, sizeBytes, uploadedAt, updatedAt] = update.values;
        state.row = {
          ...state.row, settlement_receipt_key: key, settlement_receipt_name: name,
          settlement_receipt_type: contentType, settlement_receipt_size: sizeBytes,
          settlement_receipt_uploaded_at: uploadedAt, updated_at: updatedAt, version: state.row.version + 1,
        };
      }
      const complete = statements[2];
      const operation = operations.get(complete.values.slice(2, 6).join('|'));
      operation.state = 'completed';
      operation.http_status = complete.values[0];
      operation.response_json = complete.values[1];
      operation.lease_token = '';
      operation.lease_until = '';
      state.operation = operation;
      return [1, 1, 1].map((changes) => ({ meta: { changes } }));
    },
  };
  function statement(sql, values) {
    return {
      sql,
      values,
      bind(...nextValues) { return statement(sql, nextValues); },
      async first() {
        if (sql.includes('FROM repair_orders')) {
          return values[0] === state.row.id && values[1] === state.row.company_id ? state.row : null;
        }
        if (sql.includes('FROM order_operations')) return operations.get(values.join('|')) || null;
        throw new Error(`Unexpected first: ${sql}`);
      },
      async all() {
        if (sql.includes('FROM company_capabilities')) {
          return { results: capabilities.map((capability) => ({ capability, enabled: 1 })) };
        }
        throw new Error(`Unexpected all: ${sql}`);
      },
      async run() {
        if (sql.includes('INSERT OR IGNORE INTO order_operations')) {
          const key = values.slice(0, 4).join('|');
          const operation = {
            state: 'started', target_id: values[4], request_hash: values[5], lease_token: values[6],
            lease_until: '2999-01-01 00:00:00', http_status: 0, response_json: '',
          };
          operations.set(key, operation);
          state.operation = operation;
          return { meta: { changes: 1 } };
        }
        if (sql.includes("SET state = 'completed'")) {
          const operation = operations.get(values.slice(2, 6).join('|'));
          operation.state = 'completed';
          operation.http_status = values[0];
          operation.response_json = values[1];
          operation.lease_token = '';
          operation.lease_until = '';
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unexpected run: ${sql}`);
      },
    };
  }
  return { DB, state };
}
