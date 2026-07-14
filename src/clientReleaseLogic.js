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

export function normalizeClientReleases(payload = {}) {
  return {
    windows: normalizeRelease(payload.windows, 'Windows'),
    android: normalizeRelease(payload.android, 'Android'),
  };
}
