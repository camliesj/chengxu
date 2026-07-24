import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildEditOrderPayload,
  createInitialOrderEditState,
  orderEditReducer,
} from '../src/orderEditLogic.js';
import { editOrderCommand, queryEditOperation } from '../src/orderEditApi.js';
import { NetworkUnavailableError } from '../src/platform/apiClient.js';

const contract = JSON.parse(await readFile(
  new URL('../contracts/order-edit-v1.json', import.meta.url),
  'utf8',
));

const operationId = '22222222-2222-4222-8222-222222222222';

test('initial edit state captures a complete immutable base snapshot and version', () => {
  const detail = orderDetail();
  const metadata = structuredClone(contract.metadata);
  const state = createInitialOrderEditState(detail, metadata);

  assert.equal(state.orderId, detail.id);
  assert.equal(state.expectedVersion, detail.version);
  assert.deepEqual(Object.keys(state.baseSnapshot), contract.fields);
  assert.equal(state.fields.labor, '300.00');
  assert.equal(state.fields.material, '120.00');
  assert.deepEqual(state.metadata, metadata);

  detail.customer = 'mutated after initialization';
  metadata.requiredFields.length = 0;
  assert.equal(state.baseSnapshot.customer, '张先生');
  assert.equal(state.metadata.requiredFields.length, contract.metadata.requiredFields.length);
});

test('edit reducer builds a canonical full snapshot and records conflicts without overwriting local fields', () => {
  let state = createInitialOrderEditState(orderDetail(), contract.metadata);
  state = orderEditReducer(state, { type: 'fieldChanged', field: 'record', value: '本地维修草稿' });
  state = orderEditReducer(state, { type: 'fieldChanged', field: 'labor', value: '321.45' });
  const built = buildEditOrderPayload(state, operationId);

  assert.deepEqual(Object.keys(built.payload.order).sort(), contract.fields.toSorted());
  assert.equal(built.payload.operationId, operationId);
  assert.equal(built.payload.expectedVersion, 4);
  assert.equal(built.payload.order.record, '本地维修草稿');
  assert.equal(built.payload.order.laborCents, 32145);
  assert.equal('status' in built.payload.order, false);

  const latest = { ...orderDetail(), version: 5, record: '服务端维修记录' };
  const conflicted = orderEditReducer(state, {
    type: 'conflict', latest, conflictingFields: ['record', 'laborCents'],
  });
  assert.equal(conflicted.submitState, 'conflict');
  assert.equal(conflicted.fields.record, '本地维修草稿');
  assert.equal(conflicted.latest.version, 5);
  assert.deepEqual(conflicted.conflictingFields, ['record', 'laborCents']);
});

test('edit reducer supports submission, confirmation, field errors, and explicit rebase', () => {
  const initial = createInitialOrderEditState(orderDetail(), contract.metadata);
  const submitting = orderEditReducer(initial, { type: 'submitting', operationId });
  assert.equal(submitting.submitState, 'submitting');
  assert.equal(submitting.operationId, operationId);

  const confirming = orderEditReducer(submitting, { type: 'unknownResult' });
  assert.equal(confirming.submitState, 'confirming');
  assert.equal(confirming.operationId, operationId);

  const failed = orderEditReducer(confirming, {
    type: 'serverErrors', fieldErrors: { laborCents: 'order.laborCents.non_negative_integer' },
  });
  assert.equal(failed.submitState, 'idle');
  assert.deepEqual(failed.fieldErrors, { labor: 'order.laborCents.non_negative_integer' });

  const local = orderEditReducer(initial, { type: 'fieldChanged', field: 'record', value: '保留本地' });
  const latest = { ...orderDetail(), version: 8, record: '服务端' };
  const rebased = orderEditReducer(
    orderEditReducer(local, { type: 'conflict', latest, conflictingFields: ['record'] }),
    { type: 'rebase' },
  );
  assert.equal(rebased.submitState, 'idle');
  assert.equal(rebased.expectedVersion, 8);
  assert.equal(rebased.baseSnapshot.record, '服务端');
  assert.equal(rebased.fields.record, '保留本地');
  assert.equal(rebased.operationId, '');
});

test('edit command sends PATCH and maps success plus every explicit HTTP result', async () => {
  const payload = buildEditOrderPayload(createInitialOrderEditState(orderDetail(), contract.metadata), operationId).payload;
  const session = { token: 'secret' };
  const cases = [
    [response(200, { order: { id: 'RO1', version: 5 }, operation: { state: 'completed' } }), 'success'],
    [response(200, { unexpected: true }), 'malformedResponse'],
    [response(400, { error: 'VALIDATION_FAILED', fieldErrors: { record: 'order.record.required' } }), 'validationFailure'],
    [response(401, { error: 'UNAUTHORIZED' }), 'unauthorized'],
    [response(403, { error: 'CAPABILITY_DISABLED' }), 'forbidden'],
    [response(404, { error: 'ORDER_NOT_FOUND' }), 'notFound'],
    [response(409, { error: 'ORDER_VERSION_CONFLICT', order: { id: 'RO1', version: 5 }, conflictingFields: ['record'] }), 'conflict'],
    [response(409, { error: 'ORDER_NOT_EDITABLE', order: { id: 'RO1', status: '已结算' } }), 'notEditable'],
    [response(409, { error: 'OPERATION_IN_PROGRESS' }), 'unknownResult'],
    [response(409, { error: 'OPERATION_ID_REUSED' }), 'operationReused'],
    [response(500, { error: 'INTERNAL_ERROR' }), 'serverFailure'],
  ];

  for (const [httpResponse, kind] of cases) {
    let request;
    const result = await editOrderCommand('RO1', payload, session, {
      fetcher: async (path, init) => { request = { path, init }; return httpResponse; },
    });
    assert.equal(result.kind, kind);
    assert.equal(request.path, '/api/orders/RO1');
    assert.equal(request.init.method, 'PATCH');
    assert.equal(request.init.headers.authorization, 'Bearer secret');
  }
});

test('operation query maps completed, pending, missing, malformed JSON, network, and AbortError', async () => {
  const completed = await queryEditOperation(operationId, {}, {
    fetcher: async () => response(200, { state: 'completed', order: { id: 'RO1' } }),
  });
  assert.equal(completed.kind, 'success');

  const pending = await queryEditOperation(operationId, {}, {
    fetcher: async () => response(200, { state: 'pending' }),
  });
  assert.equal(pending.kind, 'unknownResult');

  const missing = await queryEditOperation(operationId, {}, {
    fetcher: async () => response(404, { error: 'OPERATION_NOT_FOUND' }),
  });
  assert.equal(missing.kind, 'notFound');

  const malformed = await queryEditOperation(operationId, {}, {
    fetcher: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } }),
  });
  assert.equal(malformed.kind, 'malformedResponse');

  const network = await editOrderCommand('RO1', {}, {}, {
    fetcher: async () => { throw new NetworkUnavailableError(); },
  });
  assert.equal(network.kind, 'networkUnavailable');

  const aborted = new DOMException('cancelled', 'AbortError');
  await assert.rejects(
    editOrderCommand('RO1', {}, {}, { fetcher: async () => { throw aborted; } }),
    (error) => error === aborted,
  );
});

function orderDetail() {
  return {
    id: 'RO1', companyId: 'tongda', version: 4, status: '在修中',
    ...structuredClone(contract.validCases[0].expected),
  };
}

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return structuredClone(body); },
  };
}
