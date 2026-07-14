import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { apiFetch } from './apiClient.js';
import { networkStore } from './networkStore.js';

export function useNetworkStatus() {
  const state = useSyncExternalStore(
    networkStore.subscribe,
    networkStore.getSnapshot,
    networkStore.getSnapshot,
  );

  const checkNow = useCallback(async () => {
    networkStore.setChecking();
    try {
      const response = await apiFetch('/api/health', { cache: 'no-store' });
      if (!response.ok) {
        networkStore.reportFailure();
        return false;
      }
      networkStore.reportSuccess();
      return true;
    } catch {
      networkStore.reportFailure();
      return false;
    }
  }, []);

  useEffect(() => {
    checkNow();
    const handleOnline = () => checkNow();
    const handleOffline = () => networkStore.reportFailure();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkNow]);

  useEffect(() => {
    if (state.status !== 'offline') return undefined;
    const timer = window.setInterval(checkNow, 30000);
    return () => window.clearInterval(timer);
  }, [checkNow, state.status]);

  return {
    ...state,
    isOnline: state.status === 'online',
    checkNow,
  };
}
