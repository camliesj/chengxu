export function orderCapabilitySessionKey(session) {
  if (!session?.token) return '';
  return [
    session.companyId || session.company_id || 'tongda',
    session.username || session.label || '',
    session.token,
  ].join('|');
}

export function createOrderCapabilityState(session = null) {
  return {
    sessionKey: orderCapabilitySessionKey(session),
    requestId: 0,
    capabilities: [],
  };
}

export function orderCapabilityReducer(state, action = {}) {
  if (action.type === 'logout') return createOrderCapabilityState();
  if (action.type === 'sessionChanged') return createOrderCapabilityState(action.session);
  if (action.sessionKey !== state.sessionKey) return state;
  if (action.type === 'requestStarted') {
    return { ...state, requestId: action.requestId, capabilities: [] };
  }
  if (action.requestId !== state.requestId) return state;
  if (action.type === 'requestFailed') return { ...state, capabilities: [] };
  if (action.type === 'requestSucceeded') {
    return {
      ...state,
      capabilities: Array.isArray(action.capabilities)
        ? [...new Set(action.capabilities.filter((value) => typeof value === 'string'))]
        : [],
    };
  }
  return state;
}

export function hasOrderCapability(stateOrCapabilities, capability) {
  const capabilities = Array.isArray(stateOrCapabilities)
    ? stateOrCapabilities
    : stateOrCapabilities?.capabilities;
  return Array.isArray(capabilities) && capabilities.includes(capability);
}

export function receiptUploadForCapabilities(stateOrCapabilities, upload) {
  return hasOrderCapability(stateOrCapabilities, 'MAINTAIN_RECEIPT') && typeof upload === 'function'
    ? upload
    : null;
}
