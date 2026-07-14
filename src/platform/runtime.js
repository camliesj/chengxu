export const DESKTOP_API_ORIGIN = 'https://chengxu.pages.dev';

export function isTauriRuntime(
  windowLike = typeof window === 'undefined' ? undefined : window,
) {
  return Boolean(windowLike && '__TAURI_INTERNALS__' in windowLike);
}

export function resolveApiUrl(path, options = {}) {
  const desktop = options.desktop ?? isTauriRuntime();
  if (!desktop) return path;
  return new URL(path, DESKTOP_API_ORIGIN).toString();
}
