export async function onRequestGet() {
  return new Response(JSON.stringify({
    ok: true,
    service: 'chengxu',
    time: new Date().toISOString(),
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
