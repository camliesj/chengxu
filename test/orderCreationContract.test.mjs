import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildCreateOrderPayload,
  createInitialOrderCreationState,
  mapOrderCreationFieldErrors,
} from '../src/orderCreationLogic.js';
import {
  buildOrderCreationMetadata,
  normalizeCreateOrderCommand,
} from '../functions/_shared/order-creation.js';

const contractUrl = new URL('../contracts/order-creation-v1.json', import.meta.url);
const webAppUrl = new URL('../src/App.jsx', import.meta.url);
const androidCreateSourceUrl = new URL(
  '../android-client/app/src/main/java/com/chengxu/autoservice/ui/create/',
  import.meta.url,
);
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

test('clients do not contain a local formal order number or a second Android enum catalog', async () => {
  const webApp = await readFile(webAppUrl, 'utf8');
  assert.doesNotMatch(webApp, /RO202607/u);

  const androidFiles = ['CreateOrderModels.kt', 'CreateOrderScreen.kt', 'CreateOrderViewModel.kt'];
  const androidSource = (await Promise.all(androidFiles.map((name) =>
    readFile(new URL(name, androidCreateSourceUrl), 'utf8')))).join('\n');
  for (const option of ['喷漆维修（无换件）', '钣喷维修（有换件）', '机电维修保养', '数据修复']) {
    assert.equal(androidSource.includes(option), false, `Android duplicated canonical option: ${option}`);
  }
});

test('canonical fixtures produce the same web request and server normalization', async () => {
  const contract = await loadContract();
  const serverMetadata = buildOrderCreationMetadata([
    ...contract.metadata.options.insurers.map((value, index) => ({
      category: 'insurer', value, sort_order: index,
    })),
    { category: 'staff', id: 'staff-1', value: '服务顾问', extra: '张工', sort_order: 0 },
  ]);

  for (const fixture of contract.validCases) {
    const state = createInitialOrderCreationState(contract.metadata);
    state.fields = {
      ...fixture.input,
      labor: centsAsDecimal(fixture.input.laborCents),
      material: centsAsDecimal(fixture.input.materialCents),
    };
    const web = buildCreateOrderPayload(state, fixture.operationId);
    assert.deepEqual(web.fieldErrors, {}, `${fixture.name} web errors`);
    assert.equal(web.payload.operationId, fixture.operationId);
    assert.deepEqual(Object.keys(web.payload.order).sort(), [...allowedInputFields].sort());

    const server = normalizeCreateOrderCommand(web.payload.order, serverMetadata);
    assert.deepEqual(server.fieldErrors, {}, `${fixture.name} server errors`);
    assert.deepEqual(server.value, fixture.expected, `${fixture.name} normalized value`);
  }
});

test('canonical server errors retain the same visible client field mapping', async () => {
  const contract = await loadContract();
  const metadata = buildOrderCreationMetadata([
    { category: 'staff', id: 'staff-1', value: '服务顾问', extra: '张工', sort_order: 0 },
  ]);

  for (const fixture of contract.invalidCases) {
    const normalized = normalizeCreateOrderCommand(fixture.input, metadata);
    for (const [field, error] of Object.entries(fixture.fieldErrors)) {
      assert.equal(normalized.fieldErrors[field], error, `${fixture.name}:${field}`);
    }
    const visible = mapOrderCreationFieldErrors(fixture.fieldErrors);
    if (fixture.fieldErrors.laborCents) assert.equal(visible.labor, fixture.fieldErrors.laborCents);
    if (fixture.fieldErrors.materialCents) assert.equal(visible.material, fixture.fieldErrors.materialCents);
  }
});

function centsAsDecimal(cents) {
  const whole = Math.trunc(cents / 100);
  const fraction = Math.abs(cents % 100);
  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, '0')}`;
}
