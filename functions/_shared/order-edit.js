import { hasPermission, json, sha256Hex } from './auth.js';
import { buildOrderEditAuditEvent } from './order-audit.js';
import {
  claimOperation,
  findOperation,
  readOperationResult,
  replayCompletedOperation,
  storeTerminalOperationResult,
} from './order-command-operation.js';
import { buildOrderCreationMetadata } from './order-creation.js';
import { readCapabilities } from './order-foundation.js';

export const ORDER_EDIT_FIELDS = [
  'customer', 'phone', 'plate', 'car', 'vin', 'staff',
  'insuranceExpiry', 'insurer', 'type', 'accidentType', 'claimNo',
  'record', 'laborCents', 'materialCents', 'delivery', 'remark',
];

const REQUIRED_FIELDS = ['customer', 'phone', 'plate', 'car', 'insuranceExpiry', 'record'];

export function normalizeEditOrderCommand(input = {}, metadata = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const { value, fieldErrors } = canonicalizeEditSnapshot(source);

  for (const field of REQUIRED_FIELDS) {
    if (!value[field]) fieldErrors[field] = `order.${field}.required`;
  }
  for (const [field, limit] of Object.entries(metadata.maxLengths || {})) {
    if (typeof value[field] === 'string' && value[field].length > limit) {
      fieldErrors[field] = `order.${field}.too_long`;
    }
  }
  if (value.insuranceExpiry && !isValidDateOnly(value.insuranceExpiry)) {
    fieldErrors.insuranceExpiry = 'order.insuranceExpiry.invalid_date';
  }

  validateOption(fieldErrors, 'insurer', value.insurer, metadata.options?.insurers);
  validateOption(fieldErrors, 'type', value.type, metadata.options?.vehicleTypes);
  validateOption(fieldErrors, 'accidentType', value.accidentType, metadata.options?.accidentTypes);
  if (value.staff) {
    validateOption(
      fieldErrors,
      'staff',
      value.staff,
      (metadata.options?.staff || []).map((row) => row.name),
    );
  }
  if (!fieldErrors.laborCents) validateMoney(fieldErrors, 'laborCents', value.laborCents);
  if (!fieldErrors.materialCents) validateMoney(fieldErrors, 'materialCents', value.materialCents);
  if (!fieldErrors.laborCents && !fieldErrors.materialCents
      && !Number.isSafeInteger(value.laborCents + value.materialCents)) {
    fieldErrors.laborCents = 'order.laborCents.non_negative_integer';
  }

  if (Object.keys(fieldErrors).length > 0) return { value: null, fieldErrors };
  return {
    value: { ...value, amountCents: value.laborCents + value.materialCents },
    fieldErrors,
  };
}

export function diffEditableFields(existing = {}, submitted = {}) {
  return ORDER_EDIT_FIELDS.filter(
    (field) => comparable(existing?.[field]) !== comparable(submitted?.[field]),
  );
}

export async function handleEditOrderCommand({ env, session, orderId, payload }) {
  const operationId = cleanText(payload?.operationId);
  if (!isUuid(operationId)) {
    return json({ error: 'OPERATION_ID_REQUIRED' }, { status: 400 });
  }
  const expectedVersion = Number(payload?.expectedVersion);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    return json({ error: 'EXPECTED_VERSION_REQUIRED' }, { status: 400 });
  }

  const canonical = canonicalizeEditSnapshot(payload?.order);
  if (Object.keys(canonical.fieldErrors).length > 0) {
    return json(
      { error: 'VALIDATION_FAILED', fieldErrors: canonical.fieldErrors },
      { status: 400 },
    );
  }
  const key = editOperationKey(session, operationId);
  const requestHash = await sha256Hex(JSON.stringify({
    orderId: cleanText(orderId), expectedVersion, order: canonical.value,
  }));
  const priorOperation = await findOperation(env, key);
  if (priorOperation) {
    if (priorOperation.request_hash !== requestHash) {
      return json({ error: 'OPERATION_ID_REUSED' }, { status: 409 });
    }
    if (priorOperation.state === 'completed') return replayCompletedOperation(priorOperation);
  }

  const companyId = session?.company_id || 'tongda';
  const existing = await readSafeOrder(env, companyId, cleanText(orderId));
  if (!existing) return json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
  if (!hasPermission(session, 'repair')) {
    return json({ error: 'PERMISSION_REQUIRED' }, { status: 403 });
  }
  const capabilities = await readCapabilities(env, session);
  if (!capabilities.includes('EDIT_ORDER')) {
    return json({ error: 'CAPABILITY_DISABLED' }, { status: 403 });
  }
  if (!isOrdinaryStatus(existing.status)) {
    return json({ error: 'ORDER_NOT_EDITABLE', order: toOrderDetail(existing) }, { status: 409 });
  }

  const metadata = buildOrderCreationMetadata(await readEditDictionaries(env, companyId));
  const normalized = normalizeEditOrderCommand(payload?.order, metadata);
  if (!normalized.value) {
    return json(
      { error: 'VALIDATION_FAILED', fieldErrors: normalized.fieldErrors },
      { status: 400 },
    );
  }
  const changedFields = diffEditableFields(toEditableOrder(existing), normalized.value);

  const command = { operationId, expectedVersion, order: normalized.value };
  const claim = await claimOperation(env, key, requestHash, cleanText(orderId));
  if (claim.kind === 'response') return claim.response;
  if (changedFields.length === 0) {
    const body = { error: 'ORDER_NOT_CHANGED' };
    const stored = await storeTerminalOperationResult(env, key, claim.leaseToken, 400, body);
    return stored.stored
      ? json(body, { status: 400 })
      : json({ error: 'OPERATION_IN_PROGRESS' }, { status: 409 });
  }

  const now = new Date();
  const updatedAt = now.toISOString().slice(0, 19).replace('T', ' ');
  const nextRow = applyEdit(existing, command.order, expectedVersion + 1, updatedAt);
  const responseBody = {
    order: toOrderDetail(nextRow),
    serverTime: now.toISOString(),
    capabilities,
    operation: { id: operationId, state: 'completed' },
  };
  const audit = buildOrderEditAuditEvent(existing, command.order, changedFields);
  const auditEventId = await scopedAuditEventId(key);
  const responseJson = JSON.stringify(responseBody);
  const ordinaryPredicate = "status IN ('在修中', '已完工', '待结算')";

  const auditSentinel = env.DB.prepare(`
    -- audit-sentinel
    INSERT OR IGNORE INTO operation_logs
      (action, target_type, target_id, role, label, detail, event_id, summary, changes)
    SELECT 'update_order', 'repair_order', id, ?, ?, '', ?, ?, ?
    FROM repair_orders
    WHERE company_id = ? AND id = ? AND version = ? AND voided = 0
      AND ${ordinaryPredicate}
      AND EXISTS (
        SELECT 1 FROM order_operations
        WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
          AND state = 'started' AND lease_token = ? AND target_id = ?
      )
  `).bind(
    session?.role || '', session?.label || '', auditEventId, audit.summary,
    JSON.stringify(audit.changes), companyId, cleanText(orderId), expectedVersion,
    key.companyId, key.actor, key.action, key.operationId, claim.leaseToken, cleanText(orderId),
  );
  const orderUpdate = env.DB.prepare(`
    -- order-update
    UPDATE repair_orders
    SET customer = ?, phone = ?, plate = ?, car = ?, vin = ?, staff = ?,
      insurance_expiry = ?, insurer = ?, type = ?, accident_type = ?, claim_no = ?,
      record = ?, labor = ?, material = ?, amount = ?, delivery = ?, remark = ?,
      version = version + 1, updated_at = ?
    WHERE company_id = ? AND id = ? AND version = ? AND voided = 0
      AND ${ordinaryPredicate}
      AND EXISTS (
        SELECT 1 FROM operation_logs
        WHERE event_id = ? AND action = 'update_order' AND target_type = 'repair_order'
          AND target_id = repair_orders.id
      )
      AND EXISTS (
        SELECT 1 FROM order_operations
        WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
          AND state = 'started' AND lease_token = ? AND target_id = ?
      )
  `).bind(
    command.order.customer, command.order.phone, command.order.plate, command.order.car,
    command.order.vin, command.order.staff, command.order.insuranceExpiry, command.order.insurer,
    command.order.type, command.order.accidentType, command.order.claimNo, command.order.record,
    command.order.laborCents / 100, command.order.materialCents / 100,
    command.order.amountCents / 100, command.order.delivery, command.order.remark, updatedAt,
    companyId, cleanText(orderId), expectedVersion, auditEventId,
    key.companyId, key.actor, key.action, key.operationId, claim.leaseToken, cleanText(orderId),
  );
  const operationComplete = env.DB.prepare(`
    -- operation-complete
    UPDATE order_operations
    SET state = 'completed', http_status = ?, response_json = ?,
      lease_token = '', lease_until = '', updated_at = CURRENT_TIMESTAMP
    WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
      AND state = 'started' AND lease_token = ? AND target_id = ?
      AND EXISTS (
        SELECT 1 FROM operation_logs
        WHERE event_id = ? AND action = 'update_order' AND target_type = 'repair_order'
          AND target_id = ?
      )
      AND EXISTS (
        -- require-order-postcondition
        SELECT 1 FROM repair_orders AS completed_order
        WHERE completed_order.company_id = ? AND completed_order.id = ?
          AND completed_order.version = ? AND completed_order.updated_at = ?
          -- require-edit-values
          AND completed_order.customer = ? AND completed_order.phone = ?
          AND completed_order.plate = ? AND completed_order.car = ?
          AND completed_order.vin = ? AND completed_order.staff = ?
          AND completed_order.insurance_expiry = ? AND completed_order.insurer = ?
          AND completed_order.type = ? AND completed_order.accident_type = ?
          AND completed_order.claim_no = ? AND completed_order.record = ?
          AND completed_order.labor = ? AND completed_order.material = ?
          AND completed_order.amount = ? AND completed_order.delivery = ?
          AND completed_order.remark = ?
      )
  `).bind(
    200, responseJson, key.companyId, key.actor, key.action, key.operationId,
    claim.leaseToken, cleanText(orderId), auditEventId, cleanText(orderId),
    companyId, cleanText(orderId), expectedVersion + 1, updatedAt,
    command.order.customer, command.order.phone, command.order.plate, command.order.car,
    command.order.vin, command.order.staff, command.order.insuranceExpiry, command.order.insurer,
    command.order.type, command.order.accidentType, command.order.claimNo, command.order.record,
    command.order.laborCents / 100, command.order.materialCents / 100,
    command.order.amountCents / 100, command.order.delivery, command.order.remark,
  );

  const batch = await env.DB.batch([auditSentinel, orderUpdate, operationComplete]);
  if (batch.length === 3 && batch.every((result) => changes(result) === 1)) {
    return json(responseBody);
  }

  const latest = await readSafeOrder(env, companyId, cleanText(orderId));
  const operationAfterBatch = await findOperation(env, key);
  const orderWasUpdated = latest
    && Number(latest.version) === expectedVersion + 1
    && latest.updated_at === updatedAt
    && diffEditableFields(toEditableOrder(latest), command.order).length === 0;
  if (orderWasUpdated) {
    if (operationAfterBatch?.state === 'completed') {
      return replayCompletedOperation(operationAfterBatch);
    }
    const recovered = await storeTerminalOperationResult(
      env,
      key,
      claim.leaseToken,
      200,
      responseBody,
    );
    if (recovered.stored) return json(responseBody);
    const completed = await findOperation(env, key);
    if (completed?.state === 'completed') return replayCompletedOperation(completed);
    return json({ error: 'OPERATION_RESULT_INCONSISTENT' }, { status: 500 });
  }
  if (operationAfterBatch?.state === 'completed') {
    return json({ error: 'OPERATION_RESULT_INCONSISTENT' }, { status: 500 });
  }
  const conflictBody = latest && isOrdinaryStatus(latest.status)
    ? {
      error: 'ORDER_VERSION_CONFLICT',
      order: toOrderDetail(latest),
      conflictingFields: diffEditableFields(toEditableOrder(latest), command.order),
    }
    : {
      error: 'ORDER_NOT_EDITABLE',
      ...(latest ? { order: toOrderDetail(latest) } : {}),
    };
  const stored = await storeTerminalOperationResult(env, key, claim.leaseToken, 409, conflictBody);
  if (!stored.stored) return json({ error: 'OPERATION_IN_PROGRESS' }, { status: 409 });
  return json(conflictBody, { status: 409 });
}

export async function readEditOrderOperation({ env, session, operationId }) {
  if (!isUuid(operationId)) return json({ error: 'OPERATION_NOT_FOUND' }, { status: 404 });
  return readOperationResult(env, editOperationKey(session, operationId));
}

function editOperationKey(session, operationId) {
  return {
    companyId: session?.company_id || 'tongda',
    actor: cleanText(session?.username) || cleanText(session?.label),
    action: 'edit_order',
    operationId,
  };
}

async function scopedAuditEventId(key) {
  return sha256Hex(JSON.stringify([
    key.companyId,
    key.actor,
    key.action,
    key.operationId,
  ]));
}

async function readSafeOrder(env, companyId, orderId) {
  return env.DB.prepare(`
    SELECT * FROM repair_orders
    WHERE id = ? AND company_id = ? AND voided = 0
  `).bind(orderId, companyId).first();
}

async function readEditDictionaries(env, companyId) {
  const result = await env.DB.prepare(`
    SELECT id, category, value, extra, sort_order
    FROM system_dictionaries
    WHERE company_id = ? AND is_active = 1 AND category IN ('insurer', 'staff')
    ORDER BY category ASC, sort_order ASC, created_at ASC
  `).bind(companyId).all();
  return result.results || [];
}

function isOrdinaryStatus(value) {
  return ['在修中', '已完工', '待结算'].includes(value);
}

function toEditableOrder(row) {
  return {
    customer: row.customer || '', phone: row.phone || '', plate: row.plate || '', car: row.car || '',
    vin: row.vin || '', staff: row.staff || '', insuranceExpiry: row.insurance_expiry || '',
    insurer: row.insurer || '', type: row.type || '', accidentType: row.accident_type || '',
    claimNo: row.claim_no || '', record: row.record || '',
    laborCents: Math.round((Number(row.labor) || 0) * 100),
    materialCents: Math.round((Number(row.material) || 0) * 100),
    delivery: row.delivery || '', remark: row.remark || '',
  };
}

function applyEdit(existing, order, version, updatedAt) {
  return {
    ...existing,
    customer: order.customer, phone: order.phone, plate: order.plate, car: order.car,
    vin: order.vin, staff: order.staff, insurance_expiry: order.insuranceExpiry,
    insurer: order.insurer, type: order.type, accident_type: order.accidentType,
    claim_no: order.claimNo, record: order.record, labor: order.laborCents / 100,
    material: order.materialCents / 100, amount: order.amountCents / 100,
    delivery: order.delivery, remark: order.remark, version, updated_at: updatedAt,
  };
}

function toOrderDetail(row) {
  const laborCents = Math.round((Number(row.labor) || 0) * 100);
  const materialCents = Math.round((Number(row.material) || 0) * 100);
  return {
    id: row.id, companyId: row.company_id || 'tongda', version: Number(row.version) || 1,
    date: row.date || '', dateSortKey: String(row.date || '').replaceAll('-', ''), time: row.time || '',
    plate: row.plate || '', customer: row.customer || '', phone: row.phone || '', car: row.car || '',
    insurer: row.insurer || '', insuranceExpiry: row.insurance_expiry || '', type: row.type || '',
    status: row.status || '', labor: Number(row.labor) || 0, material: Number(row.material) || 0,
    amount: Number(row.amount) || 0, laborCents, materialCents, amountCents: laborCents + materialCents,
    record: row.record || '', staff: row.staff || '', delivery: row.delivery || '', vin: row.vin || '',
    claimNo: row.claim_no || '', accidentType: row.accident_type || '',
    paymentMethod: row.payment_method || '', remark: row.remark || '',
    settlementDate: row.settlement_date || '', settlementTime: row.settlement_time || '',
    settlementRemark: row.settlement_remark || '',
    receipt: row.settlement_receipt_name ? {
      name: row.settlement_receipt_name, contentType: row.settlement_receipt_type || '',
      sizeBytes: Number(row.settlement_receipt_size) || 0,
      uploadedAt: row.settlement_receipt_uploaded_at || '',
    } : null,
    voided: Number(row.voided) === 1, voidedAt: row.voided_at || '', voidReason: row.void_reason || '',
    updatedAt: row.updated_at || '',
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function changes(result) {
  return Number(result?.meta?.changes ?? result?.changes ?? 0);
}

function canonicalizeEditSnapshot(input) {
  const source = input && typeof input === 'object' ? input : {};
  const fieldErrors = {};
  for (const field of ORDER_EDIT_FIELDS) {
    if (!Object.hasOwn(source, field)) fieldErrors[field] = `order.${field}.required`;
  }
  const value = {
    customer: cleanText(source.customer), phone: cleanText(source.phone),
    plate: cleanText(source.plate), car: cleanText(source.car), vin: cleanText(source.vin),
    staff: cleanText(source.staff), insuranceExpiry: cleanText(source.insuranceExpiry),
    insurer: cleanText(source.insurer), type: cleanText(source.type),
    accidentType: cleanText(source.accidentType), claimNo: cleanText(source.claimNo),
    record: cleanText(source.record), laborCents: source.laborCents,
    materialCents: source.materialCents, delivery: cleanText(source.delivery),
    remark: cleanText(source.remark),
  };
  return {
    value: { ...value, amountCents: value.laborCents + value.materialCents },
    fieldErrors,
  };
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function comparable(value) {
  return value == null ? '' : String(value);
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
