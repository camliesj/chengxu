export const TRANSIENT_ERROR_DURATION_MS = 8000;

export function createTransientError(message, createdAt = Date.now()) {
  const text = String(message || '').trim();
  return text ? { message: text, createdAt } : null;
}

export function isTransientErrorVisible(notice, now = Date.now(), durationMs = TRANSIENT_ERROR_DURATION_MS) {
  return Boolean(notice?.message) && Number.isFinite(notice.createdAt) && now - notice.createdAt < durationMs;
}
