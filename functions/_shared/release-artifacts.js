const WINDOWS_INSTALLER_PATTERN = /^[^/\\]+\.exe$/i;
const RELEASE_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export function validateReleaseArtifact(version, fileName) {
  const cleanVersion = String(version || '').trim();
  const cleanFileName = String(fileName || '').trim();
  if (!RELEASE_VERSION_PATTERN.test(cleanVersion)) throw new Error('INVALID_RELEASE_VERSION');
  if (!WINDOWS_INSTALLER_PATTERN.test(cleanFileName) || cleanFileName.includes('..')) {
    throw new Error('INVALID_RELEASE_FILE');
  }
  return { version: cleanVersion, fileName: cleanFileName };
}

export function releaseArtifactKey(version, fileName) {
  const artifact = validateReleaseArtifact(version, fileName);
  return `releases/windows/${artifact.version}/chengxu_${artifact.version}_x64-setup.exe`;
}

export function releaseDownloadPath(version, fileName) {
  const artifact = validateReleaseArtifact(version, fileName);
  return `/api/client-downloads/windows/${artifact.version}/${encodeURIComponent(artifact.fileName)}`;
}

export function releaseContentDisposition(fileName) {
  const safeAscii = fileName.replace(/[^A-Za-z0-9._-]/g, '_');
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
