import { json } from './auth.js';

export async function claimOperation(env, key, requestHash, targetId = '') {
  let operation = await findOperation(env, key);
  if (operation) {
    if (operation.request_hash !== requestHash) {
      return responseResult(json({ error: 'OPERATION_ID_REUSED' }, { status: 409 }));
    }
    if (operation.state === 'completed') {
      return responseResult(replayCompletedOperation(operation));
    }
    if (!leaseExpired(operation.lease_until)) {
      return responseResult(json({ error: 'OPERATION_IN_PROGRESS' }, { status: 409 }));
    }
  }

  const leaseToken = crypto.randomUUID();
  if (!operation) {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO order_operations
        (company_id, actor, action, operation_id, target_id, request_hash, state, lease_token, lease_until)
      VALUES (?, ?, ?, ?, ?, ?, 'started', ?, datetime('now', '+30 seconds'))
    `).bind(
      key.companyId,
      key.actor,
      key.action,
      key.operationId,
      targetId,
      requestHash,
      leaseToken,
    ).run();
  } else {
    await env.DB.prepare(`
      UPDATE order_operations
      SET state = 'started', lease_token = ?, lease_until = datetime('now', '+30 seconds'),
        updated_at = CURRENT_TIMESTAMP
      WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
        AND request_hash = ? AND state IN ('started', 'failed')
        AND (lease_until = '' OR lease_until <= CURRENT_TIMESTAMP)
    `).bind(
      leaseToken,
      key.companyId,
      key.actor,
      key.action,
      key.operationId,
      requestHash,
    ).run();
  }

  operation = await findOperation(env, key);
  if (!operation) {
    return responseResult(json({ error: 'OPERATION_START_FAILED' }, { status: 500 }));
  }
  if (operation.request_hash !== requestHash) {
    return responseResult(json({ error: 'OPERATION_ID_REUSED' }, { status: 409 }));
  }
  if (operation.state === 'completed') {
    return responseResult(replayCompletedOperation(operation));
  }
  if (operation.lease_token !== leaseToken) {
    return responseResult(json({ error: 'OPERATION_IN_PROGRESS' }, { status: 409 }));
  }
  return { kind: 'claimed', operation, leaseToken };
}

export function replayCompletedOperation(operation) {
  const response = parseStoredResponse(operation?.response_json);
  if (!response) return json({ error: 'OPERATION_RESULT_INVALID' }, { status: 500 });
  return json(response, { status: Number(operation.http_status) || 200 });
}

export async function storeTerminalOperationResult(env, key, leaseToken, httpStatus, body) {
  const result = await env.DB.prepare(`
    UPDATE order_operations
    SET state = 'completed', http_status = ?, response_json = ?,
      lease_token = '', lease_until = '', updated_at = CURRENT_TIMESTAMP
    WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
      AND state = 'started' AND lease_token = ?
  `).bind(
    httpStatus,
    JSON.stringify(body),
    key.companyId,
    key.actor,
    key.action,
    key.operationId,
    leaseToken,
  ).run();
  return { stored: changes(result) === 1 };
}

export async function readOperationResult(env, key) {
  const operation = await findOperation(env, key);
  if (!operation) return json({ error: 'OPERATION_NOT_FOUND' }, { status: 404 });
  if (operation.state === 'completed') {
    const body = parseStoredResponse(operation.response_json);
    if (!body) return json({ error: 'OPERATION_RESULT_INVALID' }, { status: 500 });
    return json(
      { state: 'completed', ...body },
      { status: Number(operation.http_status) || 200 },
    );
  }
  return json({
    state: operation.state === 'failed' ? 'failed' : 'pending',
    operationId: key.operationId,
    targetId: operation.target_id || '',
  });
}

export async function findOperation(env, key) {
  return env.DB.prepare(`
    SELECT state, http_status, response_json, request_hash, target_id, lease_token, lease_until
    FROM order_operations
    WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
  `).bind(key.companyId, key.actor, key.action, key.operationId).first();
}

export async function beginOperation(env, key, requestHash, targetId = '') {
  return env.DB.prepare(`
    INSERT OR IGNORE INTO order_operations
      (company_id, actor, action, operation_id, target_id, request_hash, state)
    VALUES (?, ?, ?, ?, ?, ?, 'started')
  `).bind(
    key.companyId,
    key.actor,
    key.action,
    key.operationId,
    targetId,
    requestHash,
  ).run();
}

export async function completeOperation(env, key, httpStatus, response) {
  return env.DB.prepare(`
    UPDATE order_operations
    SET state = 'completed', http_status = ?, response_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE company_id = ? AND actor = ? AND action = ? AND operation_id = ?
  `).bind(
    httpStatus,
    JSON.stringify(response),
    key.companyId,
    key.actor,
    key.action,
    key.operationId,
  ).run();
}

function responseResult(response) {
  return { kind: 'response', response };
}

function leaseExpired(value) {
  const text = String(value || '');
  const timestamp = Date.parse(text.replace(' ', 'T') + (text.includes('Z') ? '' : 'Z'));
  return !Number.isFinite(timestamp) || timestamp <= Date.now();
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
