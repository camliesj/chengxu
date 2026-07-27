import test from 'node:test';
import assert from 'node:assert/strict';

import {
  changeOrderStatusCommand,
  queryStatusOperation,
} from '../src/orderStatusApi.js';
import { NetworkUnavailableError } from '../src/platform/apiClient.js';

const operationId = '33333333-3333-4333-8333-333333333333';
const command = {
  operationId,
  expectedVersion: 4,
  targetStatus: '已完工',
};

test('status command posts the canonical payload and maps explicit HTTP outcomes', async () => {
  const cases = [
    [response(200, { order: { id: 'RO1', version: 5, status: '已完工' } }), 'success'],
    [response(200, { unexpected: true }), 'malformedResponse'],
    [response(400, { error: 'INVALID_STATUS_COMMAND' }), 'invalidRequest'],
    [response(401, { error: 'UNAUTHORIZED' }), 'unauthorized'],
    [response(403, { error: 'CAPABILITY_DISABLED' }), 'forbidden'],
    [response(404, { error: 'ORDER_NOT_FOUND' }), 'notFound'],
    [response(409, { error: 'ORDER_STATUS_CONFLICT', order: { id: 'RO1', version: 5, status: '待结算' } }), 'conflict'],
    [response(409, { error: 'OPERATION_IN_PROGRESS' }), 'unknownResult'],
    [response(409, { error: 'OPERATION_ID_REUSED' }), 'operationReused'],
    [response(500, { error: 'INTERNAL_ERROR' }), 'serverFailure'],
  ];

  for (const [httpResponse, kind] of cases) {
    let request;
    const result = await changeOrderStatusCommand('RO1', command, { token: 'secret' }, {
      fetcher: async (path, init) => { request = { path, init }; return httpResponse; },
    });
    assert.equal(result.kind, kind);
    assert.equal(request.path, '/api/orders/RO1/status');
    assert.equal(request.init.method, 'POST');
    assert.equal(request.init.headers.authorization, 'Bearer secret');
    assert.deepEqual(JSON.parse(request.init.body), command);
  }
});

test('status operation query preserves unknown results and maps transport failures', async () => {
  const completed = await queryStatusOperation(operationId, {}, {
    fetcher: async () => response(200, { state: 'completed', order: { id: 'RO1', status: '已完工' } }),
  });
  assert.equal(completed.kind, 'success');

  const pending = await queryStatusOperation(operationId, {}, {
    fetcher: async () => response(200, { state: 'pending' }),
  });
  assert.equal(pending.kind, 'unknownResult');

  const malformed = await queryStatusOperation(operationId, {}, {
    fetcher: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } }),
  });
  assert.equal(malformed.kind, 'malformedResponse');

  const network = await changeOrderStatusCommand('RO1', command, {}, {
    fetcher: async () => { throw new NetworkUnavailableError(); },
  });
  assert.equal(network.kind, 'networkUnavailable');

  const aborted = new DOMException('cancelled', 'AbortError');
  await assert.rejects(
    queryStatusOperation(operationId, {}, { fetcher: async () => { throw aborted; } }),
    (error) => error === aborted,
  );
});

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return structuredClone(body); },
  };
}
