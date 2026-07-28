function normalizeRelease(item = {}, platform) {
  const available = Boolean(item.available && item.downloadUrl);
  const notes = String(item.notes || '').trim();
  const unreadableNotes = (notes.match(/\?/g) || []).length >= 3 && !/[\u3400-\u9fff]/.test(notes);

  return {
    platform,
    available,
    description: platform === 'Android'
      ? (available ? '扫码或下载 Android 安装包。' : 'Android 安装包即将发布。')
      : '适用于 Windows 10 与 Windows 11。',
    version: item.version || '',
    publishedAt: item.publishedAt || '',
    size: item.size || '',
    notes: unreadableNotes ? '' : notes,
    downloadUrl: item.downloadUrl || '',
    canDownload: available,
    actionLabel: available ? '下载客户端' : '敬请期待',
  };
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function androidInstallQrState(payload = {}, requestError = null) {
  if (requestError) return { status: 'error', release: null };
  const release = normalizeRelease(payload.android, 'Android');
  if (!release.canDownload || !isHttpsUrl(release.downloadUrl)) {
    return { status: 'unavailable', release: null };
  }
  return { status: 'ready', release };
}

export function normalizeClientReleases(payload = {}) {
  return {
    windows: normalizeRelease(payload.windows, 'Windows'),
    android: normalizeRelease(payload.android, 'Android'),
  };
}
