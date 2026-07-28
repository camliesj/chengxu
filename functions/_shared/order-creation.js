import { json, sha256Hex } from './auth.js';
import { claimOperation, findOperation } from './order-command-operation.js';
import { readCapabilities } from './order-foundation.js';

const REQUIRED_FIELDS = ['customer', 'phone', 'plate', 'car', 'insuranceExpiry', 'record'];
const VEHICLE_TYPES = ['标的车', '三者车'];
const ACCIDENT_TYPES = [
  '喷漆维修（无换件）',
  '钣喷维修（有换件）',
  '机电维修保养',
  '数据修复',
];
const DELIVERY_STATUSES = ['待确认', '今日交车', '明日交车'];
const MAX_LENGTHS = {
  customer: 80,
  phone: 40,
  plate: 24,
  car: 120,
  vin: 64,
  staff: 80,
  insuranceExpiry: 10,
  insurer: 80,
  type: 40,
  accidentType: 120,
  claimNo: 120,
  record: 2000,
  delivery: 80,
  remark: 2000,
};

export function buildOrderCreationMetadata(dictionaryRows = []) {
  const activeRows = [...dictionaryRows].sort(
    (left, right) => (Number(left.sort_order) || 0) - (Number(right.sort_order) || 0),
  );
  const insurers = unique(
    activeRows.filter((row) => row.category === 'insurer').map((row) => cleanText(row.value)),
  );
  const staff = activeRows
    .filter((row) => row.category === 'staff')
    .map((row) => ({
      id: cleanText(row.id),
      name: cleanText(row.extra),
      title: cleanText(row.value),
    }))
    .filter((row) => row.id && row.name);
  const insurerOptions = insurers.length > 0 ? insurers : ['人保财险'];

  return {
    contractVersion: 1,
    requiredFields: [...REQUIRED_FIELDS],
    defaults: {
      insurer: insurerOptions[0],
      staff: staff[0]?.name || '',
      type: VEHICLE_TYPES[0],
      accidentType: ACCIDENT_TYPES[0],
      delivery: DELIVERY_STATUSES[0],
      laborCents: 0,
      materialCents: 0,
      remark: '',
    },
    options: {
      insurers: insurerOptions,
      staff,
      vehicleTypes: [...VEHICLE_TYPES],
      accidentTypes: [...ACCIDENT_TYPES],
      deliverySuggestions: [...DELIVERY_STATUSES],
    },
    maxLengths: { ...MAX_LENGTHS },
  };
}

export function normalizeCreateOrderCommand(input = {}, metadata = buildOrderCreationMetadata()) {
  const source = input && typeof input === 'object' ? input : {};
  const fieldErrors = {};
  const value = {
    customer: cleanText(source.customer),
    phone: cleanText(source.phone),
    plate: cleanText(source.plate),
    car: cleanText(source.car),
    vin: cleanText(source.vin),
    staff: cleanText(source.staff) || metadata.defaults.staff,
    insuranceExpiry: cleanText(source.insuranceExpiry),
    insurer: cleanText(source.insurer) || metadata.defaults.insurer,
    type: cleanText(source.type) || metadata.defaults.type,
    accidentType: cleanText(source.accidentType) || metadata.defaults.accidentType,
    claimNo: cleanText(source.claimNo),
    record: cleanText(source.record),
    laborCents: source.laborCents ?? metadata.defaults.laborCents,
    materialCents: source.materialCents ?? metadata.defaults.materialCents,
    delivery: cleanText(source.delivery) || metadata.defaults.delivery,
    remark: cleanText(source.remark),
  };

  for (const field of REQUIRED_FIELDS) {
    if (!value[field]) fieldErrors[field] = `order.${field}.required`;
  }
  for (const [field, limit] of Object.entries(metadata.maxLengths || MAX_LENGTHS)) {
    if (typeof value[field] === 'string' && value[field].length > limit) {
      fieldErrors[field] = `order.${field}.too_long`;
    }
  }
  if (value.insuranceExpiry && !isValidDateOnly(value.insuranceExpiry)) {
    fieldErrors.insuranceExpiry = 'order.insuranceExpiry.invalid_date';
  }
  validateOption(fieldErrors, 'insurer', value.insurer, metadata.options.insurers);
  validateOption(fieldErrors, 'type', value.type, metadata.options.vehicleTypes);
  validateOption(fieldErrors, 'accidentType', value.accidentType, metadata.options.accidentTypes);
  if (value.staff) {
    validateOption(fieldErrors, 'staff', value.staff, metadata.options.staff.map((row) => row.name));
  }
  validateMoney(fieldErrors, 'laborCents', value.laborCents);
  validateMoney(fieldErrors, 'materialCents', value.materialCents);

  if (Object.keys(fieldErrors).length > 0) return { value: null, fieldErrors };
  return {
    value: {
      ...value,
      amountCents: value.laborCents + value.materialCents,
      status: '在修中',
      version: 1,
    },
    fieldErrors,
  };
}

export async function handleCreateOrderCommand({ env, session, payload }) {
  const operationId = cleanText(payload?.operationId);
  if (!isUuid(operationId)) {
    return json({ error: 'OPERATION_ID_REQUIRED' }, { status: 400 });
  }

  const capabilities = await readCapabilities(env, session);
  if (!capabilities.includes('CREATE_ORDER')) {
    return json({ error: 'CAPABILITY_DISABLED' }, { status: 403 });
  }
  const dictionaries = await readCreationDictionaries(env, session.company_id || 'tongda');
  const metadata = buildOrderCreationMetadata(dictionaries);
  const normalized = normalizeCreateOrderCommand(payload?.order, metadata);
  if (!normalized.value) {
    return json(
      { error: 'VALIDATION_FAILED', fieldErrors: normalized.fieldErrors },
      { status: 400 },
    );
  }

  const key = createOperationKey(session, operationId);
  const requestHash = await sha256Hex(JSON.stringify(normalized.value));
  const claim = await claimOperation(env, key, requestHash, '');
  if (claim.kind === 'response') return claim.response;

  let targetId = claim.operation.target_id;
  const now = new Date();
  const business = shanghaiDateTime(now);
  if (!targetId) {
    targetId = await allocateOrderNumber(env, business.monthKey);
    const reserved = await env.DB.prepare(`
      UPDATE order_operations
      SET target_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
        AND state = 'started' AND lease_token = ? AND target_id = ''
    `).bind(
      targetId,
      key.companyId,
      key.actor,
      key.action,
      key.operationId,
      claim.leaseToken,
    ).run();
    if (changes(reserved) !== 1) {
      return json({ error: 'OPERATION_IN_PROGRESS' }, { status: 409 });
    }
  }

  const updatedAt = utcSqlTimestamp(now);
  const row = createOrderRow({
    id: targetId,
    companyId: key.companyId,
    command: normalized.value,
    date: business.date,
    time: business.time,
    updatedAt,
  });
  const responseBody = {
    order: toCreatedOrder(row),
    serverTime: now.toISOString(),
    capabilities,
    operation: { id: operationId, state: 'completed' },
  };
  const responseJson = JSON.stringify(responseBody);
  const insertOrder = env.DB.prepare(`
    INSERT INTO repair_orders (
      id, company_id, date, time, plate, customer, phone, car, insurer,
      insurance_expiry, type, status, labor, material, amount, record, staff,
      delivery, vin, claim_no, accident_type, payment_method, remark, version,
      created_at, updated_at
    )
    SELECT ${Array.from({ length: 26 }, () => '?').join(', ')}
    WHERE EXISTS (
      SELECT 1 FROM order_operations
      WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
        AND state = 'started' AND lease_token = ? AND target_id = ?
    )
  `).bind(
    ...orderRowValues(row),
    key.companyId,
    key.actor,
    key.action,
    key.operationId,
    claim.leaseToken,
    targetId,
  );
  const archiveStatements = await buildArchiveProvisioningStatements({
    env,
    key,
    leaseToken: claim.leaseToken,
    targetId,
    order: toCreatedOrder(row),
  });
  const completeOperation = env.DB.prepare(`
    UPDATE order_operations
    SET state = 'completed', http_status = ?, response_json = ?,
      lease_token = '', lease_until = '', updated_at = CURRENT_TIMESTAMP
    WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
      AND state = 'started' AND lease_token = ? AND target_id = ?
  `).bind(
    201,
    responseJson,
    key.companyId,
    key.actor,
    key.action,
    key.operationId,
    claim.leaseToken,
    targetId,
  );
  const audit = env.DB.prepare(`
    INSERT OR IGNORE INTO operation_logs
      (action, target_type, target_id, role, label, detail, event_id, summary, changes)
    VALUES ('create_order', 'repair_order', ?, ?, ?, '', ?, '新增工单', '[]')
  `).bind(targetId, session.role || '', session.label || '', operationId);
  const batchResults = await env.DB.batch([insertOrder, ...archiveStatements, completeOperation, audit]);
  if (changes(batchResults[0]) !== 1 || changes(batchResults[1 + archiveStatements.length]) !== 1) {
    return json({ error: 'OPERATION_IN_PROGRESS' }, { status: 409 });
  }
  return json(responseBody, { status: 201 });
}

async function buildArchiveProvisioningStatements({ env, key, leaseToken, targetId, order }) {
  const existingVehicle = await readArchiveRecord(env, 'customer_vehicles', key.companyId, order.plate);
  const vehicle = {
    ...(existingVehicle?.record || {}),
    id: existingVehicle?.record.id || `CV-${order.id}`,
    companyId: key.companyId,
    customer: order.customer,
    phone: order.phone,
    plate: order.plate,
    car: order.car,
    vin: order.vin,
    insurer: order.insurer,
    vehicleType: order.type,
    source: '维修接待',
    remark: `最近工单：${order.id}`,
  };
  const statements = [upsertCustomerVehicle(env, key, leaseToken, targetId, vehicle)];
  if (!order.insuranceExpiry) return statements;

  const existingPolicy = await readArchiveRecord(env, 'insurance_policies', key.companyId, order.plate);
  const policy = {
    ...(existingPolicy?.record || {}),
    id: existingPolicy?.record.id || `IP-${order.id}`,
    companyId: key.companyId,
    customer: order.customer,
    phone: order.phone,
    plate: order.plate,
    car: order.car,
    vin: order.vin,
    insurer: order.insurer,
    expiry: order.insuranceExpiry,
    amount: existingPolicy?.record.amount || 0,
    type: existingPolicy?.record.type || '交强险 / 商业险',
  };
  const version = (existingPolicy?.version || 0) + 1;
  return [...statements, upsertInsurancePolicy(env, key, leaseToken, targetId, policy, version)];
}

async function readArchiveRecord(env, table, companyId, plate) {
  const row = await env.DB.prepare(`
    SELECT id, record_json, version
    FROM ${table}
    WHERE company_id = ? AND json_extract(record_json, '$.plate') = ?
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(companyId, plate).first();
  if (!row?.record_json) return null;
  try {
    const record = JSON.parse(row.record_json);
    if (!record || typeof record !== 'object' || !cleanText(record.id)) return null;
    return { record, version: Number(row.version) || 0 };
  } catch {
    return null;
  }
}

function operationGuard(key, leaseToken, targetId) {
  return `
    WHERE EXISTS (
      SELECT 1 FROM order_operations
      WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
        AND state = 'started' AND lease_token = ? AND target_id = ?
    )
  `;
}

function operationGuardValues(key, leaseToken, targetId) {
  return [key.companyId, key.actor, key.action, key.operationId, leaseToken, targetId];
}

function upsertCustomerVehicle(env, key, leaseToken, targetId, vehicle) {
  return env.DB.prepare(`
    INSERT INTO customer_vehicles (company_id, id, record_json, updated_at)
    SELECT ?, ?, ?, datetime('now')
    ${operationGuard(key, leaseToken, targetId)}
    ON CONFLICT(company_id, id) DO UPDATE SET
      record_json = excluded.record_json,
      updated_at = datetime('now')
  `).bind(key.companyId, vehicle.id, JSON.stringify(vehicle), ...operationGuardValues(key, leaseToken, targetId));
}

function upsertInsurancePolicy(env, key, leaseToken, targetId, policy, version) {
  return env.DB.prepare(`
    INSERT INTO insurance_policies (company_id, id, record_json, version, updated_at)
    SELECT ?, ?, ?, ?, datetime('now')
    ${operationGuard(key, leaseToken, targetId)}
    ON CONFLICT(company_id, id) DO UPDATE SET
      record_json = excluded.record_json,
      version = excluded.version,
      updated_at = datetime('now')
  `).bind(key.companyId, policy.id, JSON.stringify(policy), version, ...operationGuardValues(key, leaseToken, targetId));
}

export async function readCreateOrderOperation({ env, session, operationId }) {
  if (!isUuid(operationId)) return json({ error: 'OPERATION_NOT_FOUND' }, { status: 404 });
  const operation = await findOperation(env, createOperationKey(session, operationId));
  if (!operation) return json({ error: 'OPERATION_NOT_FOUND' }, { status: 404 });
  if (operation.state === 'completed') {
    const response = parseStoredResponse(operation.response_json);
    if (!response) return json({ error: 'OPERATION_RESULT_INVALID' }, { status: 500 });
    return json({ state: 'completed', ...response });
  }
  return json({
    state: operation.state === 'failed' ? 'failed' : 'pending',
    operationId,
    targetId: operation.target_id || '',
  });
}

export function legacyCreateOrderInput(input = {}) {
  return {
    customer: input.customer,
    phone: input.phone,
    plate: input.plate,
    car: input.car,
    vin: input.vin,
    staff: input.staff,
    insuranceExpiry: input.insuranceExpiry,
    insurer: input.insurer,
    type: input.type,
    accidentType: input.accidentType,
    claimNo: input.claimNo,
    record: input.record,
    laborCents: decimalToCents(input.labor),
    materialCents: decimalToCents(input.material),
    delivery: input.delivery,
    remark: input.remark,
  };
}

async function readCreationDictionaries(env, companyId) {
  const result = await env.DB.prepare(`
    SELECT id, category, value, extra, sort_order
    FROM system_dictionaries
    WHERE company_id = ? AND is_active = 1 AND category IN ('insurer', 'staff')
    ORDER BY category ASC, sort_order ASC, created_at ASC
  `).bind(companyId).all();
  return result.results || [];
}

function createOperationKey(session, operationId) {
  return {
    companyId: session.company_id || 'tongda',
    actor: cleanText(session.username) || cleanText(session.label),
    action: 'create_order',
    operationId,
  };
}

async function allocateOrderNumber(env, monthKey) {
  const allocation = await env.DB.prepare(`
    INSERT INTO order_number_sequences (month_key, next_value, updated_at)
    VALUES (?, 2, CURRENT_TIMESTAMP)
    ON CONFLICT(month_key) DO UPDATE SET
      next_value = order_number_sequences.next_value + 1,
      updated_at = CURRENT_TIMESTAMP
    RETURNING next_value - 1 AS sequence_value
  `).bind(monthKey).first();
  const sequence = Number(allocation?.sequence_value);
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > 99_999) {
    throw new Error('Order number sequence exhausted');
  }
  return `RO${monthKey}${String(sequence).padStart(5, '0')}`;
}

function createOrderRow({ id, companyId, command, date, time, updatedAt }) {
  return {
    id,
    company_id: companyId,
    date,
    time,
    plate: command.plate,
    customer: command.customer,
    phone: command.phone,
    car: command.car,
    insurer: command.insurer,
    insurance_expiry: command.insuranceExpiry,
    type: command.type,
    status: '在修中',
    labor: command.laborCents / 100,
    material: command.materialCents / 100,
    amount: command.amountCents / 100,
    record: command.record,
    staff: command.staff,
    delivery: command.delivery,
    vin: command.vin,
    claim_no: command.claimNo,
    accident_type: command.accidentType,
    payment_method: '待确认',
    remark: command.remark,
    version: 1,
    created_at: updatedAt,
    updated_at: updatedAt,
  };
}

function orderRowValues(row) {
  return [
    row.id, row.company_id, row.date, row.time, row.plate, row.customer, row.phone, row.car,
    row.insurer, row.insurance_expiry, row.type, row.status, row.labor, row.material, row.amount,
    row.record, row.staff, row.delivery, row.vin, row.claim_no, row.accident_type,
    row.payment_method, row.remark, row.version, row.created_at, row.updated_at,
  ];
}

function toCreatedOrder(row) {
  const laborCents = Math.round(row.labor * 100);
  const materialCents = Math.round(row.material * 100);
  return {
    id: row.id,
    companyId: row.company_id,
    version: row.version,
    date: row.date,
    dateSortKey: row.date.replaceAll('-', ''),
    time: row.time,
    plate: row.plate,
    customer: row.customer,
    phone: row.phone,
    car: row.car,
    insurer: row.insurer,
    insuranceExpiry: row.insurance_expiry,
    type: row.type,
    status: row.status,
    labor: row.labor,
    material: row.material,
    amount: row.amount,
    laborCents,
    materialCents,
    amountCents: laborCents + materialCents,
    record: row.record,
    staff: row.staff,
    delivery: row.delivery,
    vin: row.vin,
    claimNo: row.claim_no,
    accidentType: row.accident_type,
    paymentMethod: row.payment_method,
    remark: row.remark,
    settlementDate: '',
    settlementTime: '',
    settlementRemark: '',
    receipt: null,
    voided: false,
    voidedAt: '',
    voidReason: '',
    updatedAt: row.updated_at,
  };
}

function shanghaiDateTime(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map((part) => [part.type, part.value]));
  return {
    monthKey: `${parts.year}${parts.month}`,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function utcSqlTimestamp(now) {
  return now.toISOString().slice(0, 19).replace('T', ' ');
}

function decimalToCents(value) {
  const decimal = Number(value);
  return Number.isFinite(decimal) && decimal >= 0 ? Math.round(decimal * 100) : 0;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function parseStoredResponse(value) {
  try {
    const parsed = JSON.parse(value || '');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function changes(result) {
  return Number(result?.meta?.changes ?? result?.changes ?? 0);
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function validateOption(errors, field, value, options = []) {
  if (value && !options.includes(value)) errors[field] = `order.${field}.invalid_option`;
}

function validateMoney(errors, field, value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    errors[field] = `order.${field}.non_negative_integer`;
  }
}

function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
