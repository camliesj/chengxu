const RELEASE_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const PLATFORM_ARTIFACTS = {
  windows: {
    maxUploadBytes: 64 * 1024 * 1024,
    filePattern: /^[^/\\]+\.exe$/i,
    key: (version) => `releases/windows/${version}/chengxu_${version}_x64-setup.exe`,
    downloadPath: (version, fileName) => `/api/client-downloads/windows/${version}/${encodeURIComponent(fileName)}`,
    downloadContentType: 'application/octet-stream',
    uploadContentTypes: new Set([
      'application/octet-stream',
      'application/x-msdownload',
      'application/vnd.microsoft.portable-executable',
    ]),
  },
  android: {
    maxUploadBytes: 25 * 1024 * 1024,
    filePattern: /^[^/\\]+\.apk$/i,
    key: (version) => `releases/android/${version}/zhiwei-car-service_${version}.apk`,
    downloadPath: (version, fileName) => `/api/client-downloads/android/${version}/${encodeURIComponent(fileName)}`,
    downloadContentType: 'application/vnd.android.package-archive',
    uploadContentTypes: new Set([
      'application/vnd.android.package-archive',
      'application/octet-stream',
    ]),
  },
};

function artifactArguments(platformOrVersion, versionOrFileName, maybeFileName) {
  if (maybeFileName === undefined) {
    return { platform: 'windows', version: platformOrVersion, fileName: versionOrFileName };
  }
  return { platform: platformOrVersion, version: versionOrFileName, fileName: maybeFileName };
}

function platformArtifact(platform) {
  const normalizedPlatform = String(platform || '').trim().toLowerCase();
  const artifact = PLATFORM_ARTIFACTS[normalizedPlatform];
  if (!artifact) throw new Error('INVALID_RELEASE_PLATFORM');
  return { platform: normalizedPlatform, artifact };
}

export function validateReleaseArtifact(platformOrVersion, versionOrFileName, maybeFileName) {
  const input = artifactArguments(platformOrVersion, versionOrFileName, maybeFileName);
  const { platform, artifact } = platformArtifact(input.platform);
  const version = String(input.version || '').trim();
  const fileName = String(input.fileName || '').trim();
  if (!RELEASE_VERSION_PATTERN.test(version)) throw new Error('INVALID_RELEASE_VERSION');
  if (!artifact.filePattern.test(fileName) || fileName.includes('..')) {
    throw new Error('INVALID_RELEASE_FILE');
  }
  return { platform, version, fileName };
}

export function releaseArtifactKey(platformOrVersion, versionOrFileName, maybeFileName) {
  const { platform, version, fileName } = validateReleaseArtifact(platformOrVersion, versionOrFileName, maybeFileName);
  return PLATFORM_ARTIFACTS[platform].key(version, fileName);
}

export function releaseDownloadPath(platformOrVersion, versionOrFileName, maybeFileName) {
  const { platform, version, fileName } = validateReleaseArtifact(platformOrVersion, versionOrFileName, maybeFileName);
  return PLATFORM_ARTIFACTS[platform].downloadPath(version, fileName);
}

export function releaseDownloadContentType(platform) {
  return platformArtifact(platform).artifact.downloadContentType;
}

export function maxReleaseUploadBytes(platform) {
  return platformArtifact(platform).artifact.maxUploadBytes;
}

export function isReleaseUploadContentType(platform, contentType) {
  return platformArtifact(platform).artifact.uploadContentTypes.has(String(contentType || '').trim().toLowerCase());
}

export function releaseContentDisposition(fileName) {
  const safeAscii = fileName.replace(/[^A-Za-z0-9._-]/g, '_');
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
