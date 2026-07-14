import { compareVersions, releaseConfig } from '../../../../_shared/releases.js';

export async function onRequestGet({ env, params }) {
  const release = releaseConfig(env).windows;
  const supported = params.target === 'windows' && params.arch === 'x86_64';
  const isNewer = compareVersions(release.version, params.currentVersion) > 0;

  if (!supported || !release.available || !release.signature || !isNewer) {
    return new Response(null, { status: 204 });
  }

  return Response.json({
    version: release.version,
    pub_date: release.publishedAt,
    url: release.updateUrl,
    signature: release.signature,
    notes: release.notes,
  }, {
    headers: { 'cache-control': 'no-store' },
  });
}
