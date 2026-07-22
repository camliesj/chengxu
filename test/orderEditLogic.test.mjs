import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildOrderCreationMetadata } from '../functions/_shared/order-creation.js';
import {
  ORDER_EDIT_FIELDS,
  diffEditableFields,
  normalizeEditOrderCommand,
} from '../functions/_shared/order-edit.js';

const contract = JSON.parse(await readFile(
  new URL('../contracts/order-edit-v1.json', import.meta.url),
  'utf8',
));

test('edit normalizer trims a complete snapshot, preserves explicit optionals, and calculates integer cents', () => {
  const fixture = contract.validCases[0];
  const input = {
    ...fixture.input,
    ...contract.forbiddenFieldCase.values,
  };

  const normalized = normalizeEditOrderCommand(input, metadata());

  assert.deepEqual(normalized.fieldErrors, {});
  assert.deepEqual(normalized.value, fixture.expected);
  assert.equal(normalized.value.amountCents, 42000);
  assert.equal(Object.hasOwn(normalized.value, 'status'), false);
  assert.deepEqual(Object.keys(normalized.value).filter((field) => field !== 'amountCents'), ORDER_EDIT_FIELDS);
});

test('edit normalizer matches every canonical valid and invalid fixture', () => {
  for (const fixture of contract.validCases) {
    assert.deepEqual(
      normalizeEditOrderCommand(fixture.input, metadata()),
      { value: fixture.expected, fieldErrors: {} },
      fixture.name,
    );
  }

  for (const fixture of contract.invalidCases) {
    const normalized = normalizeEditOrderCommand(fixture.input, metadata());
    assert.equal(normalized.value, null, fixture.name);
    assert.deepEqual(normalized.fieldErrors, fixture.fieldErrors, fixture.name);
  }
});

test('edit normalizer rejects unsafe integer-cent values', () => {
  const input = structuredClone(contract.validCases[0].input);
  input.laborCents = Number.MAX_SAFE_INTEGER;
  input.materialCents = 1;

  const normalized = normalizeEditOrderCommand(input, metadata());

  assert.equal(normalized.value, null);
  assert.equal(normalized.fieldErrors.laborCents, 'order.laborCents.non_negative_integer');
});

test('edit normalizer rejects a full snapshot missing any one of the 16 editable fields', () => {
  for (const field of ORDER_EDIT_FIELDS) {
    const input = structuredClone(contract.validCases[0].input);
    delete input[field];

    const normalized = normalizeEditOrderCommand(input, metadata());

    assert.equal(normalized.value, null, field);
    assert.equal(normalized.fieldErrors[field], `order.${field}.required`, field);
  }
});

test('editable-field diff reports only canonical submitted differences', () => {
  const fixture = contract.conflictCases[0];

  assert.deepEqual(
    diffEditableFields(fixture.serverOrder, fixture.input),
    fixture.conflictingFields,
  );
  assert.deepEqual(diffEditableFields(
    { ...fixture.serverOrder, status: '待结算', version: 9 },
    { ...fixture.serverOrder, status: '在修中', version: 1 },
  ), []);
});

function metadata() {
  return buildOrderCreationMetadata([
    { id: 'i-1', category: 'insurer', value: '人保财险', extra: '', sort_order: 10 },
    { id: 'i-2', category: 'insurer', value: '平安财险', extra: '', sort_order: 20 },
    { id: 'i-3', category: 'insurer', value: '太平洋财险', extra: '', sort_order: 30 },
    { id: 's-1', category: 'staff', value: '接待顾问', extra: '王师傅', sort_order: 10 },
  ]);
}
