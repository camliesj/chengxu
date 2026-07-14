export function createNetworkState(status = 'checking', lastSyncedAt = '') {
  return { status, lastSyncedAt };
}

export function reduceNetworkState(state, event) {
  if (event.type === 'checking') return { ...state, status: 'checking' };
  if (event.type === 'success') return { status: 'online', lastSyncedAt: event.at };
  if (event.type === 'failure') return { ...state, status: 'offline' };
  return state;
}
