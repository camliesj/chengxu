import { hasPermission, json, sha256Hex } from './auth.js';
import {
  claimOperation,
  findOperation,
  readOperationResult,
  replayCompletedOperation,
  storeTerminalOperationResult,
} from './order-command-operation.js';
import { readCapabilities } from './order-foundation.js';
import { toMobileOrder } from '../api/orders.js';

const MAX_RECEIPT_SIZE = 12 * 1024 * 1024;
const RECEIPT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PAYMENT_METHODS = new Set(['现金', '微信', '支付宝', '保险直赔', '挂账']);

export function normalizeSettlementCommand(input = {}) {
  const base = normalizeOperation(input);
  if (!base.value) return base;
  const paymentMethod = cleanText(input.paymentMethod);
  if (!PAYMENT_METHODS.has(paymentMethod)) return invalid('PAYMENT_METHOD_INVALID');
  const settlementDate = cleanText(input.settlementDate);
  if (!isIsoDate(settlementDate)) return invalid('SETTLEMENT_DATE_INVALID');
  const settlementTime = cleanText(input.settlementTime);
  if (!isTime(settlementTime)) return invalid('SETTLEMENT_TIME_INVALID');
  const receipt = normalizeReceipt(input.receipt, base.value.companyId);
  if (!receipt.value) return receipt;
  return { value: { ...base.value, paymentMethod, settlementDate, settlementTime, settlementRemark: cleanText(input.settlementRemark), receipt: receipt.value }, error: '' };
}

export function normalizeReverseSettlementCommand(input = {}) {
  return normalizeOperation(input);
}

export function normalizeReceiptCommand(input = {}) {
  const base = normalizeOperation(input);
  if (!base.value) return base;
  if (input.receipt == null) return { value: { ...base.value, receipt: null }, error: '' };
  const receipt = normalizeReceipt(input.receipt, base.value.companyId);
  return receipt.value ? { value: { ...base.value, receipt: receipt.value }, error: '' } : receipt;
}

export async function handleSettlementCommand({ env, session, orderId, payload }) {
  const command = normalizeSettlementCommand({ ...payload, companyId: session?.company_id || 'tongda' });
  return handleCommand({ env, session, orderId, command, kind: 'settle-order' });
}

export async function handleReverseSettlementCommand({ env, session, orderId, payload }) {
  const command = normalizeReverseSettlementCommand({ ...payload, companyId: session?.company_id || 'tongda' });
  return handleCommand({ env, session, orderId, command, kind: 'reverse-settlement' });
}

export async function handleReceiptCommand({ env, session, orderId, payload }) {
  const command = normalizeReceiptCommand({ ...payload, companyId: session?.company_id || 'tongda' });
  return handleCommand({ env, session, orderId, command, kind: 'update-order-receipt' });
}

export async function readSettlementOperation({ env, session, action, operationId }) {
  if (!['settle-order', 'reverse-settlement', 'update-order-receipt'].includes(action)) {
    return json({ error: 'OPERATION_ACTION_INVALID' }, { status: 400 });
  }
  return readOperationResult(env, operationKey(session, action, cleanText(operationId)));
}

async function handleCommand({ env, session, orderId, command, kind }) {
  if (!command.value) return json({ error: command.error }, { status: 400 });
  const normalizedOrderId = cleanText(orderId);
  const value = command.value;
  const key = operationKey(session, kind, value.operationId);
  const requestHash = await sha256Hex(JSON.stringify({ orderId: normalizedOrderId, ...commandHash(value) }));
  const prior = await findOperation(env, key);
  if (prior) {
    if (prior.request_hash !== requestHash) return json({ error: 'OPERATION_ID_REUSED' }, { status: 409 });
    if (prior.state === 'completed') return replayCompletedOperation(prior);
  }

  const companyId = session?.company_id || 'tongda';
  const existing = await readSafeOrder(env, companyId, normalizedOrderId);
  if (!existing) return json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
  if (session?.role !== 'admin') return json({ error: 'ADMIN_REQUIRED' }, { status: 403 });
  if (!hasPermission(session, 'repair')) return json({ error: 'PERMISSION_REQUIRED' }, { status: 403 });
  const capabilities = await readCapabilities(env, session);
  const requiredCapabilities = kind === 'settle-order'
    ? ['SETTLE_ORDER', 'MAINTAIN_RECEIPT']
    : kind === 'reverse-settlement' ? ['REVERSE_SETTLEMENT'] : ['MAINTAIN_RECEIPT'];
  if (!requiredCapabilities.every((capability) => capabilities.includes(capability))) {
    return json({ error: 'CAPABILITY_DISABLED' }, { status: 403 });
  }
  if (kind === 'settle-order' && existing.status !== '待结算') {
    return settlementConflict(existing, 'ORDER_STATUS_CONFLICT');
  }
  if (kind === 'reverse-settlement' && existing.status !== '已结算') {
    return settlementConflict(existing, 'ORDER_STATUS_CONFLICT');
  }

  const claim = await claimOperation(env, key, requestHash, normalizedOrderId);
  if (claim.kind === 'response') return claim.response;
  const now = new Date();
  const updatedAt = now.toISOString().slice(0, 19).replace('T', ' ');
  const next = nextOrder(existing, value, kind, updatedAt);
  const body = {
    order: toMobileOrder(next),
    serverTime: now.toISOString(),
    capabilities,
    operation: { id: value.operationId, state: 'completed' },
  };
  const auditAction = auditActionFor(kind);
  const auditEventId = await sha256Hex(JSON.stringify([key.companyId, key.actor, key.action, key.operationId]));
  const responseJson = JSON.stringify(body);
  const audit = env.DB.prepare(`
    -- settlement-audit
    INSERT OR IGNORE INTO operation_logs
      (action, target_type, target_id, role, label, detail, event_id, summary, changes)
    SELECT ?, 'repair_order', id, ?, ?, '', ?, ?, ?
    FROM repair_orders
    WHERE company_id = ? AND id = ? AND version = ? AND voided = 0
      AND EXISTS (SELECT 1 FROM order_operations WHERE company_id = ? AND actor = ? AND action = ?
        AND operation_id = ? AND state = 'started' AND lease_token = ? AND target_id = ?)
  `).bind(
    auditAction, session?.role || '', session?.label || '', auditEventId, auditSummary(kind, next),
    JSON.stringify(auditChanges(existing, next, kind)), companyId, normalizedOrderId, value.expectedVersion,
    key.companyId, key.actor, key.action, key.operationId, claim.leaseToken, normalizedOrderId,
  );
  const update = commandUpdate({ env, kind, companyId, orderId: normalizedOrderId, expectedVersion: value.expectedVersion, key, claim, next, updatedAt, auditEventId });
  const complete = env.DB.prepare(`
    -- operation-complete
    UPDATE order_operations SET state = 'completed', http_status = ?, response_json = ?, lease_token = '', lease_until = '', updated_at = CURRENT_TIMESTAMP
    WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
      AND state = 'started' AND lease_token = ? AND target_id = ?
      AND EXISTS (SELECT 1 FROM operation_logs WHERE event_id = ? AND action = ?
        AND target_type = 'repair_order' AND target_id = ?)
  `).bind(
    200, responseJson, key.companyId, key.actor, key.action, key.operationId, claim.leaseToken,
    normalizedOrderId, auditEventId, auditAction, normalizedOrderId,
  );
  const result = await env.DB.batch([audit, update, complete]);
  if (changes(result[0]) === 1 && changes(result[1]) === 1 && changes(result[2]) === 1) return json(body);
  const latest = await readSafeOrder(env, companyId, normalizedOrderId);
  const conflict = { error: 'ORDER_SETTLEMENT_CONFLICT', order: latest ? toMobileOrder(latest) : null };
  await storeTerminalOperationResult(env, key, claim.leaseToken, 409, conflict);
  return json(conflict, { status: 409 });
}

function commandUpdate({ env, kind, companyId, orderId, expectedVersion, key, claim, next, updatedAt, auditEventId }) {
  const updatePredicate = `
    company_id = ? AND id = ? AND version = ? AND voided = 0
    AND EXISTS (SELECT 1 FROM operation_logs WHERE event_id = ? AND target_type = 'repair_order' AND target_id = repair_orders.id)
    AND EXISTS (SELECT 1 FROM order_operations WHERE company_id = ? AND actor = ? AND action = ?
      AND operation_id = ? AND state = 'started' AND lease_token = ? AND target_id = ?)
  `;
  const trailing = [companyId, orderId, expectedVersion, auditEventId, key.companyId, key.actor, key.action, key.operationId, claim.leaseToken, orderId];
  if (kind === 'settle-order') {
    return env.DB.prepare(`
      -- settlement-update -- settle-order-update
      UPDATE repair_orders SET status = ?, payment_method = ?, settlement_date = ?, settlement_time = ?, settlement_remark = ?,
        settlement_receipt_key = ?, settlement_receipt_name = ?, settlement_receipt_type = ?, settlement_receipt_size = ?,
        settlement_receipt_uploaded_at = ?, version = version + 1, updated_at = ?
      WHERE ${updatePredicate}
    `).bind(
      next.status, next.payment_method, next.settlement_date, next.settlement_time, next.settlement_remark,
      next.settlement_receipt_key, next.settlement_receipt_name, next.settlement_receipt_type,
      next.settlement_receipt_size, next.settlement_receipt_uploaded_at, updatedAt, ...trailing,
    );
  }
  if (kind === 'reverse-settlement') {
    return env.DB.prepare(`
      -- settlement-update -- reverse-settlement-update
      UPDATE repair_orders SET status = ?, payment_method = ?, settlement_date = ?, settlement_time = ?, settlement_remark = ?,
        version = version + 1, updated_at = ?
      WHERE ${updatePredicate}
    `).bind(next.status, next.payment_method, next.settlement_date, next.settlement_time, next.settlement_remark, updatedAt, ...trailing);
  }
  return env.DB.prepare(`
    -- settlement-update -- update-order-receipt
    UPDATE repair_orders SET settlement_receipt_key = ?, settlement_receipt_name = ?, settlement_receipt_type = ?,
      settlement_receipt_size = ?, settlement_receipt_uploaded_at = ?, version = version + 1, updated_at = ?
    WHERE ${updatePredicate}
  `).bind(
    next.settlement_receipt_key, next.settlement_receipt_name, next.settlement_receipt_type,
    next.settlement_receipt_size, next.settlement_receipt_uploaded_at, updatedAt, ...trailing,
  );
}

function nextOrder(existing, value, kind, updatedAt) {
  if (kind === 'settle-order') {
    return {
      ...existing, status: '已结算', payment_method: value.paymentMethod, settlement_date: value.settlementDate,
      settlement_time: value.settlementTime, settlement_remark: value.settlementRemark,
      settlement_receipt_key: value.receipt.key, settlement_receipt_name: value.receipt.name,
      settlement_receipt_type: value.receipt.contentType, settlement_receipt_size: value.receipt.sizeBytes,
      settlement_receipt_uploaded_at: value.receipt.uploadedAt, version: value.expectedVersion + 1, updated_at: updatedAt,
    };
  }
  if (kind === 'reverse-settlement') {
    return {
      ...existing, status: '待结算', payment_method: '待确认', settlement_date: '', settlement_time: '',
      settlement_remark: '', version: value.expectedVersion + 1, updated_at: updatedAt,
    };
  }
  return {
    ...existing,
    settlement_receipt_key: value.receipt?.key || '', settlement_receipt_name: value.receipt?.name || '',
    settlement_receipt_type: value.receipt?.contentType || '', settlement_receipt_size: value.receipt?.sizeBytes || 0,
    settlement_receipt_uploaded_at: value.receipt?.uploadedAt || '', version: value.expectedVersion + 1, updated_at: updatedAt,
  };
}

function normalizeOperation(input) {
  const operationId = cleanText(input?.operationId);
  if (!isUuid(operationId)) return invalid('OPERATION_ID_REQUIRED');
  const expectedVersion = Number(input?.expectedVersion);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return invalid('EXPECTED_VERSION_REQUIRED');
  return { value: { operationId, expectedVersion, companyId: cleanText(input?.companyId) || 'tongda' }, error: '' };
}

function normalizeReceipt(input, companyId) {
  if (!input || typeof input !== 'object') return invalid('RECEIPT_REQUIRED');
  const key = cleanText(input.key);
  if (!key.startsWith(`receipts/${companyId}/`)) return invalid('RECEIPT_NOT_FOUND');
  const name = cleanText(input.name);
  if (!name) return invalid('RECEIPT_NAME_REQUIRED');
  const contentType = cleanText(input.contentType);
  if (!RECEIPT_TYPES.has(contentType)) return invalid('UNSUPPORTED_FILE_TYPE');
  const sizeBytes = Number(input.sizeBytes);
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_RECEIPT_SIZE) return invalid('FILE_TOO_LARGE');
  const uploadedAt = cleanText(input.uploadedAt);
  if (!Number.isFinite(Date.parse(uploadedAt))) return invalid('RECEIPT_UPLOADED_AT_INVALID');
  return { value: { key, name, contentType, sizeBytes, uploadedAt }, error: '' };
}

function operationKey(session, action, operationId) {
  return {
    companyId: session?.company_id || 'tongda', actor: session?.username || session?.label || '', action, operationId,
  };
}

function commandHash(value) {
  const { companyId: _companyId, ...hashable } = value;
  return hashable;
}

function settlementConflict(existing, error) {
  return json({ error, order: toMobileOrder(existing) }, { status: 409 });
}

function auditActionFor(kind) {
  if (kind === 'settle-order') return 'settle_order';
  if (kind === 'reverse-settlement') return 'reverse_settlement';
  return 'update_order_receipt';
}

function auditSummary(kind, next) {
  if (kind === 'settle-order') return `完成结算：${next.plate || ''}`;
  if (kind === 'reverse-settlement') return `返结算：${next.plate || ''}`;
  return next.settlement_receipt_name ? `更新到账回执：${next.settlement_receipt_name}` : '清除到账回执';
}

function auditChanges(existing, next, kind) {
  if (kind === 'settle-order') return [{ field: 'status', label: '维修状态', before: existing.status, after: next.status }];
  if (kind === 'reverse-settlement') return [{ field: 'status', label: '维修状态', before: existing.status, after: next.status }];
  return [{ field: 'settlement_receipt', label: '到账回执', before: existing.settlement_receipt_name || '', after: next.settlement_receipt_name || '' }];
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function isTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function invalid(error) {
  return { value: null, error };
}

function changes(result) {
  return Number(result?.meta?.changes ?? result?.changes ?? 0);
}

async function readSafeOrder(env, companyId, orderId) {
  return env.DB.prepare('SELECT * FROM repair_orders WHERE id = ? AND company_id = ? AND voided = 0')
    .bind(orderId, companyId)
    .first();
}
