import { createNetworkState, reduceNetworkState } from '../networkLogic.js';
import { setNetworkReporter } from './apiClient.js';

let state = createNetworkState();
const listeners = new Set();

function update(event) {
  state = reduceNetworkState(state, event);
  listeners.forEach((listener) => listener());
}

export const networkStore = {
  getSnapshot: () => state,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  reportSuccess(at = new Date().toISOString()) {
    update({ type: 'success', at });
  },
  reportFailure() {
    update({ type: 'failure' });
  },
  setChecking() {
    update({ type: 'checking' });
  },
};

setNetworkReporter({
  isOnline: () => networkStore.getSnapshot().status !== 'offline',
  success: () => networkStore.reportSuccess(),
  failure: () => networkStore.reportFailure(),
});
