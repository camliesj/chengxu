export function compareVersions(left, right) {
  const a = String(left || '').split('.').map((part) => Number(part) || 0);
  const b = String(right || '').split('.').map((part) => Number(part) || 0);

  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) > (b[index] || 0)) return 1;
    if ((a[index] || 0) < (b[index] || 0)) return -1;
  }

  return 0;
}

function platformConfig(env, prefix) {
  const version = String(env[`${prefix}_RELEASE_VERSION`] || '').trim();
  const downloadUrl = String(env[`${prefix}_RELEASE_DOWNLOAD_URL`] || '').trim();

  return {
    available: Boolean(version && downloadUrl),
    version,
    publishedAt: String(env[`${prefix}_RELEASE_PUBLISHED_AT`] || '').trim(),
    size: String(env[`${prefix}_RELEASE_SIZE`] || '').trim(),
    notes: String(env[`${prefix}_RELEASE_NOTES`] || '').trim(),
    downloadUrl,
    updateUrl: String(env[`${prefix}_RELEASE_UPDATE_URL`] || downloadUrl).trim(),
    signature: String(env[`${prefix}_RELEASE_SIGNATURE`] || '').trim(),
  };
}

export function releaseConfig(env = {}) {
  return {
    windows: platformConfig(env, 'DESKTOP'),
    android: platformConfig(env, 'ANDROID'),
  };
}
