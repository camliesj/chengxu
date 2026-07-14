import { json } from './auth.js';

function cleanText(value) {
  return String(value || '').trim();
}

export function getCosConfig(env) {
  const secretId = cleanText(env.TENCENT_SECRET_ID);
  const secretKey = cleanText(env.TENCENT_SECRET_KEY);
  const bucket = cleanText(env.COS_BUCKET);
  const region = cleanText(env.COS_REGION);
  if (!secretId || !secretKey || !bucket || !region) return null;
  return {
    secretId,
    secretKey,
    bucket,
    region,
    host: `${bucket}.cos.${region}.myqcloud.com`,
  };
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha1Hex(value) {
  const buffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
  return toHex(buffer);
}

async function hmacSha1Hex(key, value) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value));
  return toHex(signature);
}

async function cosAuthorization(method, key, config) {
  const now = Math.floor(Date.now() / 1000);
  const keyTime = `${now};${now + 900}`;
  const pathname = `/${key.split('/').map(encodeURIComponent).join('/')}`;
  const httpString = `${method.toLowerCase()}\n${pathname}\n\nhost=${config.host}\n`;
  const stringToSign = `sha1\n${keyTime}\n${await sha1Hex(httpString)}\n`;
  const signKey = await hmacSha1Hex(config.secretKey, keyTime);
  const signature = await hmacSha1Hex(signKey, stringToSign);
  return {
    pathname,
    authorization: `q-sign-algorithm=sha1&q-ak=${config.secretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`,
  };
}

export async function cosFetch(method, key, env, init = {}) {
  const config = getCosConfig(env);
  if (!config) return { error: json({ error: 'COS_NOT_CONFIGURED' }, { status: 500 }) };
  const signed = await cosAuthorization(method, key, config);
  const response = await fetch(`https://${config.host}${signed.pathname}`, {
    ...init,
    method,
    headers: {
      authorization: signed.authorization,
      ...(init.headers || {}),
    },
  });
  return { response };
}

export async function cosFailure(response, error) {
  const text = await response.text().catch(() => '');
  return json({ error, cosStatus: response.status, cosMessage: text.slice(0, 500) }, { status: response.status });
}
