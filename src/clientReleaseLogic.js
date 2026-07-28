function normalizeRelease(item = {}, platform) {
  const available = Boolean(item.available && item.downloadUrl);

  return {
    platform,
    available,
    version: item.version || '',
    publishedAt: item.publishedAt || '',
    size: item.size || '',
    notes: item.notes || '',
    downloadUrl: item.downloadUrl || '',
    canDownload: available,
    actionLabel: available ? '立即下载' : '敬请期待',
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
