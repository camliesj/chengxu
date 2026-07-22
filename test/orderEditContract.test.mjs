import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contract = JSON.parse(await readFile(
  new URL('../contracts/order-edit-v1.json', import.meta.url),
  'utf8',
));
const creationContract = JSON.parse(await readFile(
  new URL('../contracts/order-creation-v1.json', import.meta.url),
  'utf8',
));

const EDIT_FIELDS = [
  'customer', 'phone', 'plate', 'car', 'vin', 'staff',
  'insuranceExpiry', 'insurer', 'type', 'accidentType', 'claimNo',
  'record', 'laborCents', 'materialCents', 'delivery', 'remark',
];
const FORBIDDEN_FIELDS = [
  'id', 'companyId', 'role', 'status', 'version', 'date', 'dateSortKey', 'time',
  'labor', 'material', 'amount', 'amountCents', 'paymentMethod',
  'settlementDate', 'settlementTime', 'settlementRemark',
  'settlementReceiptKey', 'settlementReceiptName', 'settlementReceiptType',
  'settlementReceiptSize', 'settlementReceiptUploadedAt', 'receipt',
  'voided', 'voidedAt', 'voidReason', 'updatedAt',
];

test('edit contract locks version, fields, and stage 2 metadata', () => {
  assert.equal(contract.version, 1);
  assert.deepEqual(contract.fields, EDIT_FIELDS);
  assert.deepEqual(contract.metadata, creationContract.metadata);
});

test('edit contract provides two canonical full snapshots', () => {
  assert.ok(contract.validCases.length >= 2);
  for (const fixture of contract.validCases) {
    assert.deepEqual(Object.keys(fixture.input), EDIT_FIELDS);
    assert.deepEqual(
      Object.keys(fixture.expected).filter((field) => field !== 'amountCents'),
      EDIT_FIELDS,
    );
    assert.equal(
      fixture.expected.amountCents,
      fixture.expected.laborCents + fixture.expected.materialCents,
    );
  }
});

test('edit contract covers every validator family with stable field errors', () => {
  const casesByName = new Map(contract.invalidCases.map((fixture) => [fixture.name, fixture]));
  assert.deepEqual(
    [...casesByName.keys()],
    ['missing-required-fields', 'too-long-fields', 'invalid-date', 'invalid-options', 'invalid-money'],
  );
  assert.deepEqual(casesByName.get('missing-required-fields').fieldErrors, {
    customer: 'order.customer.required',
    phone: 'order.phone.required',
    plate: 'order.plate.required',
    car: 'order.car.required',
    insuranceExpiry: 'order.insuranceExpiry.required',
    record: 'order.record.required',
  });
  assert.ok(
    casesByName.get('too-long-fields').input.customer.length > contract.metadata.maxLengths.customer,
  );
  assert.equal(casesByName.get('too-long-fields').fieldErrors.customer, 'order.customer.too_long');
  assert.equal(casesByName.get('invalid-date').fieldErrors.insuranceExpiry, 'order.insuranceExpiry.invalid_date');
  assert.deepEqual(casesByName.get('invalid-options').fieldErrors, {
    insurer: 'order.insurer.invalid_option',
    type: 'order.type.invalid_option',
    accidentType: 'order.accidentType.invalid_option',
  });
  assert.deepEqual(casesByName.get('invalid-money').fieldErrors, {
    laborCents: 'order.laborCents.non_negative_integer',
    materialCents: 'order.materialCents.non_negative_integer',
  });
});

test('edit contract protects system fields and locks conflict differences', () => {
  assert.deepEqual(contract.forbiddenFields, FORBIDDEN_FIELDS);
  assert.deepEqual(Object.keys(contract.forbiddenFieldCase.values), FORBIDDEN_FIELDS);
  assert.equal(contract.conflictCases.length, 1);
  assert.deepEqual(contract.conflictCases[0].conflictingFields, ['record', 'laborCents']);
});
