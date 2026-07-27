import { hasPermission, json, sha256Hex } from './auth.js';
import { buildOrderAuditEvent } from './order-audit.js';
import {
  claimOperation,
  findOperation,
  readOperationResult,
  replayCompletedOperation,
  storeTerminalOperationResult,
} from './order-command-operation.js';
import { readCapabilities } from './order-foundation.js';
import { toMobileOrder } from '../api/orders.js';
import { ORDINARY_ORDER_STATUSES, canTransitionOrderStatus } from '../../shared/orderStatusPermissions.js';

export function normalizeStatusCommand(input = {}) {
  const operationId = cleanText(input?.operationId);
  if (!isUuid(operationId)) return { value: null, error: 'OPERATION_ID_REQUIRED' };

  const expectedVersion = Number(input?.expectedVersion);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    return { value: null, error: 'EXPECTED_VERSION_REQUIRED' };
  }

  const targetStatus = cleanText(input?.targetStatus);
  if (!isOrdinaryStatusTarget(targetStatus)) {
    return { value: null, error: 'TARGET_STATUS_INVALID' };
  }
  return { value: { operationId, expectedVersion, targetStatus }, error: '' };
}

export function isOrdinaryStatusTarget(status) {
  return ORDINARY_ORDER_STATUSES.includes(cleanText(status));
}

export async function handleStatusCommand({ env, session, orderId, payload }) {
  const command = normalizeStatusCommand(payload);
  if (!command.value) return json({ error: command.error }, { status: 400 });
  const { operationId, expectedVersion, targetStatus } = command.value;
  const companyId = session?.company_id || 'tongda';
  const key = statusOperationKey(session, operationId);
  const requestHash = await sha256Hex(JSON.stringify({ orderId: cleanText(orderId), expectedVersion, targetStatus }));
  const prior = await findOperation(env, key);
  if (prior) {
    if (prior.request_hash !== requestHash) return json({ error: 'OPERATION_ID_REUSED' }, { status: 409 });
    if (prior.state === 'completed') return replayCompletedOperation(prior);
  }

  const existing = await readSafeOrder(env, companyId, cleanText(orderId));
  if (!existing) return json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
  if (!hasPermission(session, 'repair')) return json({ error: 'PERMISSION_REQUIRED' }, { status: 403 });
  const capabilities = await readCapabilities(env, session);
  if (!capabilities.includes('ADVANCE_ORDER_STATUS')) return json({ error: 'CAPABILITY_DISABLED' }, { status: 403 });
  if (!isOrdinaryStatusTarget(existing.status)) return json({ error: 'ORDER_STATUS_CONFLICT', order: toMobileOrder(existing) }, { status: 409 });
  if (!canTransitionOrderStatus(session?.role, existing.status, targetStatus)) {
    return json({ error: 'STATUS_TRANSITION_FORBIDDEN' }, { status: 403 });
  }

  const claim = await claimOperation(env, key, requestHash, cleanText(orderId));
  if (claim.kind === 'response') return claim.response;
  const now = new Date();
  const updatedAt = now.toISOString().slice(0, 19).replace('T', ' ');
  const next = { ...existing, status: targetStatus, version: expectedVersion + 1, updated_at: updatedAt };
  const body = {
    order: toMobileOrder(next),
    serverTime: now.toISOString(),
    capabilities,
    operation: { id: operationId, state: 'completed' },
  };
  const audit = buildOrderAuditEvent(existing, next);
  const auditEventId = await sha256Hex(JSON.stringify([key.companyId, key.actor, key.action, key.operationId]));
  const responseJson = JSON.stringify(body);
  const ordinaryPredicate = "status IN ('在修中', '已完工', '待结算')";
  const auditSentinel = env.DB.prepare(`
    -- audit-sentinel
    INSERT OR IGNORE INTO operation_logs
      (action, target_type, target_id, role, label, detail, event_id, summary, changes)
    SELECT 'change_order_status', 'repair_order', id, ?, ?, '', ?, ?, ?
    FROM repair_orders
    WHERE company_id = ? AND id = ? AND version = ? AND voided = 0 AND ${ordinaryPredicate}
      AND EXISTS (SELECT 1 FROM order_operations WHERE company_id = ? AND actor = ? AND action = ?
        AND operation_id = ? AND state = 'started' AND lease_token = ? AND target_id = ?)
  `).bind(
    session?.role || '', session?.label || '', auditEventId, audit?.summary || '更新工单状态',
    JSON.stringify(audit?.changes || []), companyId, cleanText(orderId), expectedVersion,
    key.companyId, key.actor, key.action, key.operationId, claim.leaseToken, cleanText(orderId),
  );
  const statusUpdate = env.DB.prepare(`
    -- order-update
    UPDATE repair_orders SET status = ?, version = version + 1, updated_at = ?
    WHERE company_id = ? AND id = ? AND version = ? AND voided = 0 AND ${ordinaryPredicate}
      AND EXISTS (SELECT 1 FROM operation_logs WHERE event_id = ? AND action = 'change_order_status'
        AND target_type = 'repair_order' AND target_id = repair_orders.id)
      AND EXISTS (SELECT 1 FROM order_operations WHERE company_id = ? AND actor = ? AND action = ?
        AND operation_id = ? AND state = 'started' AND lease_token = ? AND target_id = ?)
  `).bind(
    targetStatus, updatedAt, companyId, cleanText(orderId), expectedVersion, auditEventId,
    key.companyId, key.actor, key.action, key.operationId, claim.leaseToken, cleanText(orderId),
  );
  const complete = env.DB.prepare(`
    -- operation-complete
    UPDATE order_operations SET state = 'completed', http_status = ?, response_json = ?, lease_token = '', lease_until = '', updated_at = CURRENT_TIMESTAMP
    WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
      AND state = 'started' AND lease_token = ? AND target_id = ?
      AND EXISTS (SELECT 1 FROM operation_logs WHERE event_id = ? AND action = 'change_order_status'
        AND target_type = 'repair_order' AND target_id = ?)
  `).bind(
    200, responseJson, key.companyId, key.actor, key.action, key.operationId, claim.leaseToken,
    cleanText(orderId), auditEventId, cleanText(orderId),
  );
  const result = await env.DB.batch([auditSentinel, statusUpdate, complete]);
  if (changes(result[0]) === 1 && changes(result[1]) === 1 && changes(result[2]) === 1) {
    return json(body);
  }
  const latest = await readSafeOrder(env, companyId, cleanText(orderId));
  const conflictBody = { error: 'ORDER_STATUS_CONFLICT', order: latest ? toMobileOrder(latest) : null };
  await storeTerminalOperationResult(env, key, claim.leaseToken, 409, conflictBody);
  return json(conflictBody, { status: 409 });
}

export async function readStatusOperation({ env, session, operationId }) {
  return readOperationResult(env, statusOperationKey(session, cleanText(operationId)));
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function statusOperationKey(session, operationId) {
  return {
    companyId: session?.company_id || 'tongda',
    actor: session?.username || session?.label || '',
    action: 'change_order_status',
    operationId,
  };
}

async function readSafeOrder(env, companyId, orderId) {
  return env.DB.prepare('SELECT * FROM repair_orders WHERE id = ? AND company_id = ? AND voided = 0')
    .bind(orderId, companyId)
    .first();
}

function changes(result) {
  return Number(result?.meta?.changes ?? result?.changes ?? 0);
}
