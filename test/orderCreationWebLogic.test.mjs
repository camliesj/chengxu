import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCreateOrderPayload,
  createInitialOrderCreationState,
  moneyTextToCents,
  orderCreationReducer,
  validateOrderCreationStep,
} from '../src/orderCreationLogic.js';
import {
  createOrderCommand,
  fetchOrderCreationMetadata,
  queryCreateOrderOperation,
} from '../src/orderCreationApi.js';

const metadata = {
  contractVersion: 1,
  requiredFields: ['customer', 'phone', 'plate', 'car', 'insuranceExpiry', 'record'],
  defaults: {
    insurer: '人保财险', staff: '张工', type: '标的车',
    accidentType: '喷漆维修（无换件）', delivery: '待确认', laborCents: 0,
    materialCents: 0, remark: '',
  },
  options: {},
  maxLengths: {},
};

test('four-step reducer applies metadata, edits fields and guards navigation', () => {
  let state = createInitialOrderCreationState();
  state = orderCreationReducer(state, { type: 'metadataLoaded', metadata, canCreate: true });
  assert.equal(state.step, 0);
  assert.equal(state.fields.insurer, '人保财险');
  assert.equal(state.fields.staff, '张工');

  state = orderCreationReducer(state, { type: 'next' });
  assert.equal(state.step, 0);
  assert.equal(state.fieldErrors.customer, 'order.customer.required');
  for (const [field, value] of Object.entries({
    customer: '王先生', phone: '15000000000', plate: '蒙K12345', car: '小鹏 P7+',
  })) {
    state = orderCreationReducer(state, { type: 'fieldChanged', field, value });
  }
  state = orderCreationReducer(state, { type: 'next' });
  assert.equal(state.step, 1);
  state = orderCreationReducer(state, { type: 'back' });
  assert.equal(state.step, 0);
  assert.equal(state.dirty, true);
});

test('money conversion is exact and rejects negative, overflow and excess precision', () => {
  assert.deepEqual(moneyTextToCents('1200.50'), { value: 120050, error: '' });
  assert.deepEqual(moneyTextToCents('0'), { value: 0, error: '' });
  assert.equal(moneyTextToCents('-1').error, 'order.money.non_negative');
  assert.equal(moneyTextToCents('1.005').error, 'order.money.max_two_decimals');
  assert.equal(moneyTextToCents('999999999999999').error, 'order.money.out_of_range');
});

test('payload builder emits canonical cents and no system-owned fields', () => {
  const state = filledState();
  const result = buildCreateOrderPayload(state, '11111111-1111-4111-8111-111111111111');

  assert.deepEqual(result.fieldErrors, {});
  assert.equal(result.payload.order.laborCents, 120050);
  assert.equal(result.payload.order.materialCents, 88000);
  for (const field of ['id', 'companyId', 'role', 'status', 'version', 'date', 'time']) {
    assert.equal(Object.hasOwn(result.payload.order, field), false);
  }
});

test('step validation reports only fields belonging to the active step', () => {
  const state = createInitialOrderCreationState(metadata);
  assert.deepEqual(validateOrderCreationStep(state, 0), {
    customer: 'order.customer.required', phone: 'order.phone.required',
    plate: 'order.plate.required', car: 'order.car.required',
  });
  assert.deepEqual(validateOrderCreationStep(state, 1), {
    insuranceExpiry: 'order.insuranceExpiry.required',
  });
  assert.deepEqual(validateOrderCreationStep(state, 2), {
    record: 'order.record.required',
  });
});

test('web API adapter maps metadata, success, field errors and unknown results', async () => {
  const session = { token: 'token' };
  const calls = [];
  const fetcher = async (path, init) => {
    calls.push({ path, init });
    if (path === '/api/order-creation-metadata') {
      return jsonResponse({ metadata, capabilities: ['CREATE_ORDER'], canCreate: true, serverTime: 'now' });
    }
    if (path.startsWith('/api/order-operations/')) {
      return jsonResponse({ state: 'completed', order: { id: 'RO20260700001' } });
    }
    return jsonResponse({ order: { id: 'RO20260700001' } }, 201);
  };

  assert.equal((await fetchOrderCreationMetadata(session, { fetcher })).kind, 'success');
  const created = await createOrderCommand(buildCreateOrderPayload(filledState(), crypto.randomUUID()).payload, session, { fetcher });
  assert.equal(created.kind, 'success');
  assert.equal(created.value.order.id, 'RO20260700001');
  assert.equal(JSON.parse(calls[1].init.body).order.id, undefined);
  assert.equal((await queryCreateOrderOperation(crypto.randomUUID(), session, { fetcher })).kind, 'success');

  const validation = await createOrderCommand({}, session, {
    fetcher: async () => jsonResponse({ error: 'VALIDATION_FAILED', fieldErrors: { plate: 'order.plate.required' } }, 400),
  });
  assert.deepEqual(validation, { kind: 'validationFailure', fieldErrors: { plate: 'order.plate.required' } });
  const pending = await createOrderCommand({}, session, {
    fetcher: async () => jsonResponse({ error: 'OPERATION_IN_PROGRESS' }, 409),
  });
  assert.deepEqual(pending, { kind: 'unknownResult' });
});

function filledState() {
  let state = createInitialOrderCreationState(metadata);
  const values = {
    customer: '王先生', phone: '15000000000', plate: '蒙K12345', car: '小鹏 P7+', vin: '',
    staff: '张工', insuranceExpiry: '2027-07-21', insurer: '人保财险', type: '标的车',
    accidentType: '喷漆维修（无换件）', claimNo: '', record: '喷漆维修',
    labor: '1200.50', material: '880', delivery: '明日下午', remark: '',
  };
  for (const [field, value] of Object.entries(values)) {
    state = orderCreationReducer(state, { type: 'fieldChanged', field, value });
  }
  return state;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
