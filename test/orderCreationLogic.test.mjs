import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildOrderCreationMetadata,
  normalizeCreateOrderCommand,
} from '../functions/_shared/order-creation.js';

const contractUrl = new URL('../contracts/order-creation-v1.json', import.meta.url);

async function contract() {
  return JSON.parse(await readFile(contractUrl, 'utf8'));
}

function metadata() {
  return buildOrderCreationMetadata([
    { id: 'insurer-1', category: 'insurer', value: '人保财险', extra: '', sort_order: 10 },
    { id: 'insurer-2', category: 'insurer', value: '平安财险', extra: '', sort_order: 20 },
    { id: 'staff-1', category: 'staff', value: '接待顾问', extra: '张工', sort_order: 10 },
  ]);
}

test('creation normalizer matches every canonical valid fixture', async () => {
  const fixtures = await contract();
  for (const fixture of fixtures.validCases) {
    const result = normalizeCreateOrderCommand(fixture.input, metadata());
    assert.deepEqual(result.fieldErrors, {}, fixture.name);
    assert.deepEqual(result.value, fixture.expected, fixture.name);
  }
});

test('creation normalizer emits canonical stable errors', async () => {
  const fixtures = await contract();
  for (const fixture of fixtures.invalidCases) {
    const result = normalizeCreateOrderCommand(fixture.input, metadata());
    for (const [field, errorKey] of Object.entries(fixture.fieldErrors)) {
      assert.equal(result.fieldErrors[field], errorKey, `${fixture.name}.${field}`);
    }
    assert.equal(result.value, null);
  }
});

test('creation normalizer ignores client-owned system fields and rejects unknown options', () => {
  const result = normalizeCreateOrderCommand({
    customer: '王先生', phone: '15000000000', plate: '蒙K12345', car: '小鹏 P7+',
    insuranceExpiry: '2027-07-21', record: '喷漆', insurer: '虚构保险',
    type: '管理员自定义', accidentType: '喷漆维修（无换件）', delivery: '待确认',
    laborCents: 0, materialCents: 0,
    id: 'CLIENT-ID', companyId: 'other-company', role: 'admin', status: '已结算', version: 99,
  }, metadata());

  assert.equal(result.value, null);
  assert.equal(result.fieldErrors.insurer, 'order.insurer.invalid_option');
  assert.equal(result.fieldErrors.type, 'order.type.invalid_option');
  assert.equal(Object.hasOwn(result.fieldErrors, 'id'), false);
  assert.equal(Object.hasOwn(result.fieldErrors, 'status'), false);
});

test('metadata derives company dictionaries while fixed options remain canonical', () => {
  const result = metadata();

  assert.equal(result.contractVersion, 1);
  assert.deepEqual(result.options.insurers, ['人保财险', '平安财险']);
  assert.deepEqual(result.options.staff, [{ id: 'staff-1', name: '张工', title: '接待顾问' }]);
  assert.deepEqual(result.options.vehicleTypes, ['标的车', '三者车']);
  assert.equal(result.options.accidentTypes.length, 4);
  assert.equal(result.defaults.staff, '张工');
  assert.equal(result.defaults.insurer, '人保财险');
});
