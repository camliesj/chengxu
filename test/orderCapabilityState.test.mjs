import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOrderCapabilityState,
  hasOrderCapability,
  orderCapabilityReducer,
  orderCapabilitySessionKey,
  receiptUploadForCapabilities,
} from '../src/orderCapabilityState.js';

const sessionA = { token: 'token-a', companyId: 'tongda', username: 'alice', role: 'admin' };
const sessionB = { token: 'token-b', companyId: 'xinqiheng', username: 'bob', role: 'admin' };

test('order capabilities fail closed on request failure, session switch, and logout', () => {
  const keyA = orderCapabilitySessionKey(sessionA);
  let state = createOrderCapabilityState(sessionA);
  state = orderCapabilityReducer(state, { type: 'requestStarted', sessionKey: keyA, requestId: 1 });
  state = orderCapabilityReducer(state, {
    type: 'requestSucceeded', sessionKey: keyA, requestId: 1, capabilities: ['EDIT_ORDER'],
  });
  assert.equal(hasOrderCapability(state, 'EDIT_ORDER'), true);

  state = orderCapabilityReducer(state, { type: 'requestStarted', sessionKey: keyA, requestId: 2 });
  assert.deepEqual(state.capabilities, []);
  state = orderCapabilityReducer(state, { type: 'requestFailed', sessionKey: keyA, requestId: 2 });
  assert.deepEqual(state.capabilities, []);

  state = orderCapabilityReducer(state, { type: 'sessionChanged', session: sessionB });
  assert.equal(state.sessionKey, orderCapabilitySessionKey(sessionB));
  assert.deepEqual(state.capabilities, []);
  state = orderCapabilityReducer(state, { type: 'logout' });
  assert.deepEqual(state, createOrderCapabilityState());
});

test('stale initial or manual refresh results cannot cross session or request boundaries', () => {
  const keyA = orderCapabilitySessionKey(sessionA);
  const keyB = orderCapabilitySessionKey(sessionB);
  let state = orderCapabilityReducer(createOrderCapabilityState(sessionA), {
    type: 'requestStarted', sessionKey: keyA, requestId: 1,
  });
  state = orderCapabilityReducer(state, { type: 'sessionChanged', session: sessionB });
  state = orderCapabilityReducer(state, { type: 'requestStarted', sessionKey: keyB, requestId: 2 });

  const afterOldSession = orderCapabilityReducer(state, {
    type: 'requestSucceeded', sessionKey: keyA, requestId: 1, capabilities: ['EDIT_ORDER'],
  });
  assert.equal(afterOldSession, state);

  state = orderCapabilityReducer(state, { type: 'requestStarted', sessionKey: keyB, requestId: 3 });
  const afterOldRefresh = orderCapabilityReducer(state, {
    type: 'requestSucceeded', sessionKey: keyB, requestId: 2, capabilities: ['EDIT_ORDER'],
  });
  assert.equal(afterOldRefresh, state);
  state = orderCapabilityReducer(state, {
    type: 'requestSucceeded', sessionKey: keyB, requestId: 3, capabilities: ['SETTLE_ORDER'],
  });
  assert.deepEqual(state.capabilities, ['SETTLE_ORDER']);
});

test('settlement and receipt-maintenance capabilities remain independent', () => {
  const state = {
    ...createOrderCapabilityState(sessionA),
    capabilities: ['SETTLE_ORDER'],
  };
  assert.equal(hasOrderCapability(state, 'SETTLE_ORDER'), true);
  assert.equal(hasOrderCapability(state, 'MAINTAIN_RECEIPT'), false);
  const upload = () => Promise.resolve();
  assert.equal(receiptUploadForCapabilities(state, upload), null);
  assert.equal(receiptUploadForCapabilities({ ...state, capabilities: ['MAINTAIN_RECEIPT'] }, upload), upload);
});
