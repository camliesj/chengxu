import { cosFailure, cosFetch } from '../../../../_shared/cos.js';
import {
  releaseArtifactKey,
  releaseContentDisposition,
  validateReleaseArtifact,
} from '../../../../_shared/release-artifacts.js';

export async function onRequestGet({ env, params }) {
  let artifact;
  try {
    artifact = validateReleaseArtifact(params.version, params.fileName);
  } catch {
    return new Response(null, { status: 404 });
  }

  const key = releaseArtifactKey(artifact.version, artifact.fileName);
  const { response, error } = await cosFetch('GET', key, env);
  if (error) return error;
  if (!response.ok) return cosFailure(response, 'RELEASE_NOT_FOUND');

  const headers = new Headers({
    'content-type': 'application/octet-stream',
    'content-disposition': releaseContentDisposition(artifact.fileName),
    'cache-control': 'public, max-age=31536000, immutable',
  });
  const contentLength = response.headers.get('content-length');
  if (contentLength) headers.set('content-length', contentLength);

  return new Response(response.body, { status: 200, headers });
}
