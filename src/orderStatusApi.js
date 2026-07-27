import { apiFetch, NetworkUnavailableError } from './platform/apiClient.js';

export async function changeOrderStatusCommand(orderId, command, session, options = {}) {
  return request(
    `/api/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(command),
    },
    session,
    options,
    completedResult,
  );
}

export async function queryStatusOperation(operationId, session, options = {}) {
  return request(
    `/api/order-operations/change-order-status/${encodeURIComponent(operationId)}`,
    {},
    session,
    options,
    (body) => body?.state === 'pending'
      ? { kind: 'unknownResult' }
      : completedResult(body),
  );
}

async function request(path, init, session, options, successMapper) {
  const fetcher = options.fetcher || apiFetch;
  const headers = {
    ...(init.headers || {}),
    ...(session?.token ? { authorization: `Bearer ${session.token}` } : {}),
  };
  try {
    const response = await fetcher(path, { ...init, headers, signal: options.signal });
    const body = await response.json().catch(() => null);
    if (response.ok) return successMapper(body);
    if (response.status === 400) return { kind: 'invalidRequest', error: body?.error || 'INVALID_REQUEST' };
    if (response.status === 401) return { kind: 'unauthorized' };
    if (response.status === 403) return { kind: 'forbidden', error: body?.error || 'FORBIDDEN' };
    if (response.status === 404) return { kind: 'notFound', error: body?.error || 'NOT_FOUND' };
    if (response.status === 409) return mapConflict(body);
    return response.status >= 500 ? { kind: 'serverFailure' } : { kind: 'malformedResponse' };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return error instanceof NetworkUnavailableError || error instanceof TypeError
      ? { kind: 'networkUnavailable' }
      : { kind: 'serverFailure' };
  }
}

function completedResult(body) {
  return body?.order?.id ? { kind: 'success', value: body } : { kind: 'malformedResponse' };
}

function mapConflict(body) {
  switch (body?.error) {
    case 'ORDER_STATUS_CONFLICT':
      return { kind: 'conflict', latest: body.order || null };
    case 'OPERATION_IN_PROGRESS':
      return { kind: 'unknownResult' };
    case 'OPERATION_ID_REUSED':
      return { kind: 'operationReused' };
    default:
      return { kind: 'conflict', error: body?.error || 'CONFLICT' };
  }
}
