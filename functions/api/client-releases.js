import { releaseConfig } from '../_shared/releases.js';

export async function onRequestGet({ env }) {
  return new Response(JSON.stringify(releaseConfig(env)), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
