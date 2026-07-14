import { isTauriRuntime, resolveApiUrl } from './runtime.js';

const readNavigatorOnline = () => (
  typeof navigator === 'undefined' || navigator.onLine !== false
);

const defaultNetworkReporter = {
  isOnline: readNavigatorOnline,
  success: () => {},
  failure: () => {},
};

let networkReporter = defaultNetworkReporter;
let sessionExpiredReporter = () => {};
let testFetch;

export class NetworkUnavailableError extends Error {
  constructor(message = '网络不可用，请检查网络连接后重试') {
    super(message);
    this.name = 'NetworkUnavailableError';
  }
}

export function setNetworkReporter(reporter = {}) {
  networkReporter = { ...defaultNetworkReporter, ...reporter };
}

export function setSessionExpiredReporter(reporter) {
  sessionExpiredReporter = typeof reporter === 'function' ? reporter : () => {};
}

export function setApiClientFetchForTests(fetchImplementation) {
  testFetch = fetchImplementation;
}

export function resetApiClientForTests() {
  testFetch = undefined;
  networkReporter = defaultNetworkReporter;
  sessionExpiredReporter = () => {};
}

function isMutationRequest(init) {
  const method = String(init?.method || 'GET').toUpperCase();
  return !['GET', 'HEAD', 'OPTIONS'].includes(method);
}

function hasAuthorizationHeader(headers) {
  if (!headers) return false;
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.has('authorization');
  }
  if (Array.isArray(headers)) {
    return headers.some(([key]) => String(key).toLowerCase() === 'authorization');
  }
  return Object.keys(headers).some((key) => key.toLowerCase() === 'authorization');
}

async function getFetchImplementation(desktop) {
  if (testFetch) return testFetch;
  if (desktop) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    return tauriFetch;
  }
  return globalThis.fetch.bind(globalThis);
}

export async function apiFetch(path, init = {}, options = {}) {
  const desktop = options.desktop ?? isTauriRuntime();
  const mutation = isMutationRequest(init);

  if (mutation && !networkReporter.isOnline()) {
    const error = new NetworkUnavailableError();
    networkReporter.failure(error);
    throw error;
  }

  try {
    const fetchImplementation = await getFetchImplementation(desktop);
    const response = await fetchImplementation(resolveApiUrl(path, { desktop }), init);
    networkReporter.success(response);

    if (response.status === 401 && hasAuthorizationHeader(init.headers)) {
      sessionExpiredReporter(response);
    }

    return response;
  } catch (error) {
    if (error instanceof NetworkUnavailableError) throw error;
    const networkError = new NetworkUnavailableError();
    networkError.cause = error;
    networkReporter.failure(networkError);
    throw networkError;
  }
}
