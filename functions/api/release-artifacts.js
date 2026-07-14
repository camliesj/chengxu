import { json, requireSession } from '../_shared/auth.js';
import { cosFailure, cosFetch } from '../_shared/cos.js';
import { releaseArtifactKey, releaseDownloadPath, validateReleaseArtifact } from '../_shared/release-artifacts.js';

const MAX_INSTALLER_SIZE = 25 * 1024 * 1024;
const ALLOWED_INSTALLER_TYPES = new Set([
  'application/octet-stream',
  'application/x-msdownload',
  'application/vnd.microsoft.portable-executable',
]);

export async function onRequestPost({ request, env }) {
  const { error } = await requireSession(request, env, { adminOnly: true });
  if (error) return error;

  let artifact;
  try {
    artifact = validateReleaseArtifact(
      request.headers.get('x-release-version'),
      decodeURIComponent(request.headers.get('x-file-name') || ''),
    );
  } catch (validationError) {
    return json({ error: validationError.message }, { status: 400 });
  }

  const contentType = String(request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_INSTALLER_TYPES.has(contentType)) {
    return json({ error: 'INVALID_RELEASE_CONTENT_TYPE' }, { status: 400 });
  }

  const declaredSize = Number(request.headers.get('content-length') || 0);
  if (declaredSize > MAX_INSTALLER_SIZE) return json({ error: 'RELEASE_FILE_TOO_LARGE' }, { status: 413 });
  const body = await request.arrayBuffer();
  if (body.byteLength <= 0) return json({ error: 'RELEASE_FILE_REQUIRED' }, { status: 400 });
  if (body.byteLength > MAX_INSTALLER_SIZE) return json({ error: 'RELEASE_FILE_TOO_LARGE' }, { status: 413 });

  const key = releaseArtifactKey(artifact.version, artifact.fileName);
  const { response, error: cosError } = await cosFetch('PUT', key, env, {
    body,
    headers: { 'content-type': 'application/octet-stream' },
  });
  if (cosError) return cosError;
  if (!response.ok) return cosFailure(response, 'RELEASE_UPLOAD_FAILED');

  const downloadUrl = new URL(releaseDownloadPath(artifact.version, artifact.fileName), request.url).toString();
  return json({ ok: true, key, downloadUrl, size: body.byteLength });
}
