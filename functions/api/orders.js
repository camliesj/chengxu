import { json, requireSession, writeOperationLog } from '../_shared/auth.js';
import { buildOrderAuditEvent, protectArchiveEdit, settledEditAccessError } from '../_shared/order-audit.js';
import { decodeOrderCursor, encodeOrderCursor, readCapabilities } from '../_shared/order-foundation.js';
import { handleCreateOrderCommand, legacyCreateOrderInput } from '../_shared/order-creation.js';
import { handleEditOrderCommand } from '../_shared/order-edit.js';
import { canEmployeeSetOrderStatus } from '../../shared/orderStatusPermissions.js';

const CURRENT_STATUSES = ['在修中', '已完工', '待结算'];
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

const ORDER_COLUMNS = [
  'id',
  'company_id',
  'date',
  'time',
  'plate',
  'customer',
  'phone',
  'car',
  'insurer',
  'insurance_expiry',
  'type',
  'status',
  'labor',
  'material',
  'amount',
  'record',
  'staff',
  'delivery',
  'vin',
  'claim_no',
  'accident_type',
  'payment_method',
  'remark',
  'settlement_date',
  'settlement_time',
  'settlement_remark',
  'settlement_receipt_key',
  'settlement_receipt_name',
  'settlement_receipt_type',
  'settlement_receipt_size',
  'settlement_receipt_uploaded_at',
  'voided',
  'voided_at',
  'void_reason',
];

export function toOrder(row) {
  return {
    id: row.id,
    companyId: row.company_id || 'tongda',
    date: row.date,
    time: row.time,
    plate: row.plate,
    customer: row.customer,
    phone: row.phone,
    car: row.car,
    insurer: row.insurer,
    insuranceExpiry: row.insurance_expiry || '',
    type: row.type,
    status: row.status,
    labor: Number(row.labor) || 0,
    material: Number(row.material) || 0,
    amount: Number(row.amount) || 0,
    record: row.record,
    staff: row.staff,
    delivery: row.delivery,
    vin: row.vin || '',
    claimNo: row.claim_no || '',
    accidentType: row.accident_type || '',
    paymentMethod: row.payment_method || '',
    remark: row.remark || '',
    settlementDate: row.settlement_date || '',
    settlementTime: row.settlement_time || '',
    settlementRemark: row.settlement_remark || '',
    settlementReceiptKey: row.settlement_receipt_key || '',
    settlementReceiptName: row.settlement_receipt_name || '',
    settlementReceiptType: row.settlement_receipt_type || '',
    settlementReceiptSize: Number(row.settlement_receipt_size) || 0,
    settlementReceiptUploadedAt: row.settlement_receipt_uploaded_at || '',
    voided: Number(row.voided) === 1,
    voidedAt: row.voided_at || '',
    voidReason: row.void_reason || '',
  };
}

export function toMobileOrder(row) {
  const legacy = toOrder(row);
  const {
    settlementReceiptKey: _receiptKey,
    settlementReceiptName: _receiptName,
    settlementReceiptType: _receiptType,
    settlementReceiptSize: _receiptSize,
    settlementReceiptUploadedAt: _receiptUploadedAt,
    ...safe
  } = legacy;
  return {
    ...safe,
    version: Number(row.version) || 1,
    updatedAt: row.updated_at || '',
    receipt: row.settlement_receipt_name ? {
      name: row.settlement_receipt_name,
      contentType: row.settlement_receipt_type || '',
      sizeBytes: Number(row.settlement_receipt_size) || 0,
      uploadedAt: row.settlement_receipt_uploaded_at || '',
    } : null,
  };
}

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeOrder(input, session) {
  const labor = normalizeMoney(input.labor);
  const material = normalizeMoney(input.material);
  const amount = normalizeMoney(input.amount) || labor + material;

  return {
    id: cleanText(input.id),
    company_id: cleanText(input.companyId) || session?.company_id || 'tongda',
    date: cleanText(input.date),
    time: cleanText(input.time),
    plate: cleanText(input.plate),
    customer: cleanText(input.customer),
    phone: cleanText(input.phone),
    car: cleanText(input.car),
    insurer: cleanText(input.insurer) || '人保财险',
    insurance_expiry: cleanText(input.insuranceExpiry),
    type: cleanText(input.type) || '标的车',
    status: cleanText(input.status) || '在修中',
    labor,
    material,
    amount,
    record: cleanText(input.record),
    staff: cleanText(input.staff) || '张工',
    delivery: cleanText(input.delivery) || '待确认',
    vin: cleanText(input.vin),
    claim_no: cleanText(input.claimNo),
    accident_type: cleanText(input.accidentType) || '常规维修',
    payment_method: cleanText(input.paymentMethod) || '待确认',
    remark: cleanText(input.remark),
    settlement_date: cleanText(input.settlementDate),
    settlement_time: cleanText(input.settlementTime),
    settlement_remark: cleanText(input.settlementRemark),
    settlement_receipt_key: cleanText(input.settlementReceiptKey),
    settlement_receipt_name: cleanText(input.settlementReceiptName),
    settlement_receipt_type: cleanText(input.settlementReceiptType),
    settlement_receipt_size: Number(input.settlementReceiptSize) || 0,
    settlement_receipt_uploaded_at: cleanText(input.settlementReceiptUploadedAt),
    voided: input.voided ? 1 : 0,
    voided_at: cleanText(input.voidedAt),
    void_reason: cleanText(input.voidReason),
  };
}

function validateOrder(order, existing) {
  const requiredFields = ['id', 'date', 'time', 'plate', 'customer', 'phone', 'car', 'record'];
  if (!existing) {
    requiredFields.push('insurance_expiry');
  }
  const missing = requiredFields.filter((field) => !order[field]);
  if (missing.length > 0) {
    return `缺少必填字段：${missing.join(', ')}`;
  }
  return '';
}

export function validateSettlementPermission(order, existing, session) {
  if (session.role === 'admin') return '';
  const isStatusChanged = !existing || order.status !== existing.status;
  if (isStatusChanged && !canEmployeeSetOrderStatus(order.status)) {
    return 'SETTLEMENT_ADMIN_REQUIRED';
  }
  return '';
}

export async function onRequestGet({ request, env }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;

  const url = new URL(request.url);
  const scope = cleanText(url.searchParams.get('scope'));
  if (!scope) return readLegacyOrders(env, session);
  if (!['current', 'history'].includes(scope)) {
    return json({ error: 'INVALID_SCOPE' }, { status: 400 });
  }
  return readScopedOrders({ url, env, session, scope });
}

async function readLegacyOrders(env, session) {
  const result = await env.DB.prepare(
    'SELECT * FROM repair_orders WHERE voided = 0 AND company_id = ? ORDER BY date DESC, time DESC, created_at DESC',
  ).bind(session.company_id || 'tongda').all();
  return json({
    orders: result.results.map(toOrder),
    capabilities: await readCapabilities(env, session),
    serverTime: new Date().toISOString(),
  });
}

async function readScopedOrders({ url, env, session, scope }) {
  const cursorText = cleanText(url.searchParams.get('cursor'));
  const updatedAfterText = cleanText(url.searchParams.get('updatedAfter'));
  if (cursorText && updatedAfterText) {
    return json({ error: 'AMBIGUOUS_PAGINATION' }, { status: 400 });
  }

  const cursor = cursorText ? decodeOrderCursor(cursorText) : null;
  if (cursorText && !cursor) return json({ error: 'INVALID_CURSOR' }, { status: 400 });
  if (cursor && cursor.scope !== scope) {
    return json({ error: 'INVALID_CURSOR_SCOPE' }, { status: 400 });
  }
  const updatedAfter = updatedAfterText ? normalizeUpdatedAfter(updatedAfterText) : null;
  if (updatedAfterText && !updatedAfter) {
    return json({ error: 'INVALID_UPDATED_AFTER' }, { status: 400 });
  }

  const limit = pageLimit(url.searchParams.get('limit'));
  const mode = updatedAfter ? 'delta' : (cursor?.mode || 'full');
  const page = mode === 'delta'
    ? await readDeltaPage({ env, session, scope, cursor, updatedAfter, limit })
    : await readFullPage({ env, session, scope, cursor, limit });
  const visibleRows = [];
  const removedOrderIds = [];
  for (const row of page.rows) {
    if (belongsToScope(row, scope)) visibleRows.push(row);
    else if (mode === 'delta') removedOrderIds.push(row.id);
  }
  return json({
    orders: visibleRows.map(toMobileOrder),
    nextCursor: page.nextCursor,
    removedOrderIds: [...new Set(removedOrderIds)],
    serverTime: new Date().toISOString(),
    capabilities: await readCapabilities(env, session),
  });
}

async function readFullPage({ env, session, scope, cursor, limit }) {
  const conditions = ['company_id = ?', 'voided = 0'];
  const values = [session.company_id || 'tongda'];
  if (scope === 'current') {
    conditions.push('status IN (?, ?, ?)');
    values.push(...CURRENT_STATUSES);
  } else {
    conditions.push('status = ?');
    values.push('已结算');
  }
  if (cursor) {
    conditions.push('(updated_at < ? OR (updated_at = ? AND id < ?))');
    values.push(cursor.updatedAt, cursor.updatedAt, cursor.id);
  }
  values.push(limit + 1);
  const result = await env.DB.prepare(`
    SELECT * FROM repair_orders
    WHERE ${conditions.join(' AND ')}
    ORDER BY updated_at DESC, id DESC
    LIMIT ?
  `).bind(...values).all();
  return pageResult(result.results || [], limit, 'full', scope);
}

async function readDeltaPage({ env, session, scope, cursor, updatedAfter, limit }) {
  const values = [session.company_id || 'tongda'];
  let changeCondition;
  if (cursor) {
    changeCondition = '(updated_at > ? OR (updated_at = ? AND id > ?))';
    values.push(cursor.updatedAt, cursor.updatedAt, cursor.id);
  } else {
    changeCondition = 'updated_at > ?';
    values.push(updatedAfter);
  }
  values.push(limit + 1);
  const result = await env.DB.prepare(`
    SELECT * FROM repair_orders
    WHERE company_id = ? AND ${changeCondition}
    ORDER BY updated_at ASC, id ASC
    LIMIT ?
  `).bind(...values).all();
  return pageResult(result.results || [], limit, 'delta', scope);
}

function pageResult(results, limit, mode, scope) {
  const rows = results.slice(0, limit);
  const last = rows.at(-1);
  return {
    rows,
    nextCursor: results.length > limit && last
      ? encodeOrderCursor({ mode, scope, updatedAt: last.updated_at, id: last.id })
      : null,
  };
}

function belongsToScope(row, scope) {
  if (Number(row.voided) === 1) return false;
  return scope === 'current' ? CURRENT_STATUSES.includes(row.status) : row.status === '已结算';
}

function pageLimit(value) {
  const parsed = Number.parseInt(String(value || DEFAULT_PAGE_LIMIT), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_PAGE_LIMIT;
  return Math.min(MAX_PAGE_LIMIT, Math.max(1, parsed));
}

function normalizeUpdatedAfter(value) {
  const text = cleanText(value);
  const input = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u.test(text)
    ? `${text.replace(' ', 'T')}Z`
    : text;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export async function onRequestPost({ request, env }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;

  const payload = await request.json();
  const mode = cleanText(payload.mode);
  const eventId = cleanText(payload.eventId);
  let order = normalizeOrder(payload.order || payload, session);
  const existing = await env.DB.prepare('SELECT * FROM repair_orders WHERE id = ? AND company_id = ?')
    .bind(order.id, session.company_id || 'tongda')
    .first();
  if (!existing) {
    return handleCreateOrderCommand({
      env,
      session,
      payload: { operationId: eventId, order: legacyCreateOrderInput(payload.order || payload) },
    });
  }
  return routeLegacyExistingOrder({ env, session, payload, existing });
}

export function legacyEditOrderInput(input = {}) {
  return legacyCreateOrderInput(input);
}

export async function routeLegacyExistingOrder({
  env,
  session,
  payload,
  existing,
  editOrderCommand = handleEditOrderCommand,
  legacyUpsert = legacyUpsertExistingOrder,
}) {
  const mode = cleanText(payload?.mode);
  const source = payload?.order || payload || {};
  const order = normalizeOrder(source, session);
  if (isOrdinaryLegacyEdit({ mode, order, existing, session })) {
    return editOrderCommand({
      env,
      session,
      orderId: existing.id,
      payload: {
        operationId: cleanText(payload?.eventId),
        expectedVersion: source.version,
        order: legacyEditOrderInput(source),
      },
    });
  }
  return legacyUpsert({ env, session, payload, existing, order, mode });
}

function isOrdinaryLegacyEdit({ mode, order, existing, session }) {
  if (mode || !CURRENT_STATUSES.includes(existing?.status) || order.status !== existing.status) return false;
  const normalizedExisting = normalizeOrder(toOrder(existing), session);
  const legacyOnlyFields = [
    'payment_method', 'settlement_date', 'settlement_time', 'settlement_remark',
    'settlement_receipt_key', 'settlement_receipt_name', 'settlement_receipt_type',
    'settlement_receipt_size', 'settlement_receipt_uploaded_at',
    'voided', 'voided_at', 'void_reason',
  ];
  return legacyOnlyFields.every(
    (field) => String(order[field] ?? '') === String(normalizedExisting[field] ?? ''),
  );
}

async function legacyUpsertExistingOrder({ env, session, payload, existing, order: normalizedOrder, mode }) {
  let order = normalizedOrder;
  const settledAccessError = settledEditAccessError(existing, session.role);
  if (settledAccessError) return json({ error: settledAccessError }, { status: 403 });
  if (mode === 'archive_edit') {
    if (session.role !== 'admin') return json({ error: 'ARCHIVE_EDIT_ADMIN_REQUIRED' }, { status: 403 });
    if (!existing || existing.status !== '已结算') return json({ error: 'ARCHIVE_EDIT_SETTLED_ONLY' }, { status: 400 });
    order = protectArchiveEdit(order, existing);
  }
  const validationError = validateOrder(order, existing);
  if (validationError) {
    return json({ error: validationError }, { status: 400 });
  }
  const permissionError = validateSettlementPermission(order, existing, session);
  if (permissionError) {
    return json({ error: permissionError }, { status: 403 });
  }

  const placeholders = ORDER_COLUMNS.map(() => '?').join(', ');
  const updates = ORDER_COLUMNS
    .filter((column) => column !== 'id')
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');

  await env.DB.prepare(`
    INSERT INTO repair_orders (${ORDER_COLUMNS.join(', ')}, updated_at)
    VALUES (${placeholders}, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET ${updates}, updated_at = CURRENT_TIMESTAMP
  `).bind(...ORDER_COLUMNS.map((column) => order[column])).run();

  const auditEvent = buildOrderAuditEvent(existing, order);
  if (auditEvent) {
    await writeOperationLog(
      env,
      session,
      auditEvent.action,
      'repair_order',
      order.id,
      `${order.plate} ${order.customer}`,
      { eventId, summary: auditEvent.summary, changes: auditEvent.changes },
    );
  }

  return json({ order: toOrder(order) });
}
