import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contractUrl = new URL('../contracts/order-creation-v1.json', import.meta.url);
const allowedInputFields = new Set([
  'customer', 'phone', 'plate', 'car', 'vin', 'staff',
  'insuranceExpiry', 'insurer', 'type', 'accidentType', 'claimNo',
  'record', 'laborCents', 'materialCents', 'delivery', 'remark',
]);
const forbiddenSystemFields = [
  'id', 'companyId', 'role', 'status', 'version', 'date', 'time',
  'settlementDate', 'receipt', 'voided',
];

async function loadContract() {
  return JSON.parse(await readFile(contractUrl, 'utf8'));
}

test('canonical creation contract defines versioned metadata and integer-cent defaults', async () => {
  const contract = await loadContract();

  assert.equal(contract.version, 1);
  assert.equal(contract.metadata.defaults.insurer, '人保财险');
  assert.equal(contract.metadata.defaults.type, '标的车');
  assert.equal(contract.metadata.defaults.delivery, '待确认');
  assert.equal(contract.metadata.defaults.laborCents, 0);
  assert.equal(contract.metadata.defaults.materialCents, 0);
  assert.deepEqual(contract.metadata.requiredFields, [
    'customer', 'phone', 'plate', 'car', 'insuranceExpiry', 'record',
  ]);
  assert.ok(contract.metadata.options.vehicleTypes.includes('标的车'));
  assert.ok(contract.metadata.options.accidentTypes.length >= 4);
});

test('canonical valid cases contain only client-writable fields and expected normalization', async () => {
  const contract = await loadContract();

  assert.ok(contract.validCases.length >= 2);
  for (const fixture of contract.validCases) {
    assert.match(fixture.operationId, /^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
    assert.deepEqual(Object.keys(fixture.input).sort(), [...allowedInputFields].sort());
    for (const field of forbiddenSystemFields) {
      assert.equal(Object.hasOwn(fixture.input, field), false, `${fixture.name} leaked ${field}`);
    }
    assert.equal(Number.isSafeInteger(fixture.expected.laborCents), true);
    assert.equal(Number.isSafeInteger(fixture.expected.materialCents), true);
    assert.equal(
      fixture.expected.amountCents,
      fixture.expected.laborCents + fixture.expected.materialCents,
    );
    assert.equal(fixture.expected.status, '在修中');
    assert.equal(fixture.expected.version, 1);
  }
});

test('canonical invalid cases use stable field-error keys', async () => {
  const contract = await loadContract();

  assert.ok(contract.invalidCases.length >= 3);
  for (const fixture of contract.invalidCases) {
    assert.ok(Object.keys(fixture.fieldErrors).length > 0);
    for (const [field, errorKey] of Object.entries(fixture.fieldErrors)) {
      assert.ok(allowedInputFields.has(field));
      assert.match(errorKey, /^order\.[a-zA-Z]+\.[a-zA-Z_]+$/);
    }
  }
});
