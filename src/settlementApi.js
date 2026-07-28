import { apiFetch, NetworkUnavailableError } from './platform/apiClient.js';

export function settleOrderCommand(orderId, command, session, options = {}) {
  return send(`/api/orders/${encodeURIComponent(orderId)}/settlement`, command, session, options);
}

export function reverseSettlementCommand(orderId, command, session, options = {}) {
  return send(`/api/orders/${encodeURIComponent(orderId)}/reverse-settlement`, command, session, options);
}

export function updateOrderReceiptCommand(orderId, command, session, options = {}) {
  return send(`/api/orders/${encodeURIComponent(orderId)}/receipt`, command, session, options);
}

async function send(path, command, session, options) {
  const fetcher = options.fetcher || apiFetch;
  try {
    const response = await fetcher(path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(session?.token ? { authorization: `Bearer ${session.token}` } : {}),
      },
      body: JSON.stringify(command),
      signal: options.signal,
    });
    const body = await response.json().catch(() => null);
    if (response.ok) return body?.order?.id ? { kind: 'success', value: body } : { kind: 'malformedResponse' };
    if (response.status === 400) return { kind: 'invalidRequest', error: body?.error || 'INVALID_REQUEST' };
    if (response.status === 401) return { kind: 'unauthorized' };
    if (response.status === 403) return { kind: 'forbidden', error: body?.error || 'FORBIDDEN' };
    if (response.status === 404) return { kind: 'notFound', error: body?.error || 'NOT_FOUND' };
    if (response.status === 409) {
      if (body?.error === 'OPERATION_IN_PROGRESS') return { kind: 'unknownResult' };
      if (body?.error === 'OPERATION_ID_REUSED') return { kind: 'operationReused' };
      return { kind: 'conflict', latest: body?.order || null, error: body?.error || 'CONFLICT' };
    }
    return response.status >= 500 ? { kind: 'serverFailure' } : { kind: 'malformedResponse' };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return error instanceof NetworkUnavailableError || error instanceof TypeError
      ? { kind: 'networkUnavailable' }
      : { kind: 'serverFailure' };
  }
}
