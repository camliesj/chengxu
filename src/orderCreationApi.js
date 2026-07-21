import { apiFetch, NetworkUnavailableError } from './platform/apiClient.js';

export async function fetchOrderCreationMetadata(session, options = {}) {
  return request('/api/order-creation-metadata', {}, session, options, (body) => (
    body?.metadata && Array.isArray(body.capabilities)
      ? { kind: 'success', value: body }
      : { kind: 'malformedResponse' }
  ));
}

export async function createOrderCommand(payload, session, options = {}) {
  return request('/api/orders/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }, session, options, (body) => (
    body?.order?.id ? { kind: 'success', value: body } : { kind: 'malformedResponse' }
  ));
}

export async function queryCreateOrderOperation(operationId, session, options = {}) {
  return request(
    `/api/order-operations/create-order/${encodeURIComponent(operationId)}`,
    {},
    session,
    options,
    (body) => body?.state === 'completed' && body?.order?.id
      ? { kind: 'success', value: body }
      : body?.state === 'pending'
        ? { kind: 'unknownResult' }
        : { kind: 'malformedResponse' },
  );
}

async function request(path, init, session, options, successMapper) {
  const fetcher = options.fetcher || apiFetch;
  const headers = { ...(init.headers || {}), ...(session?.token ? { authorization: `Bearer ${session.token}` } : {}) };
  try {
    const response = await fetcher(path, { ...init, headers, signal: options.signal });
    const body = await response.json().catch(() => null);
    if (response.ok) return successMapper(body);
    if (response.status === 400 && body?.error === 'VALIDATION_FAILED') {
      return { kind: 'validationFailure', fieldErrors: body.fieldErrors || {} };
    }
    if (response.status === 401) return { kind: 'unauthorized' };
    if (response.status === 403) return { kind: 'forbidden', error: body?.error || 'FORBIDDEN' };
    if (response.status === 409 && body?.error === 'OPERATION_IN_PROGRESS') return { kind: 'unknownResult' };
    if (response.status === 409) return { kind: 'conflict', error: body?.error || 'CONFLICT' };
    return response.status >= 500 ? { kind: 'serverFailure' } : { kind: 'malformedResponse' };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return error instanceof NetworkUnavailableError || error instanceof TypeError
      ? { kind: 'networkUnavailable' }
      : { kind: 'serverFailure' };
  }
}
