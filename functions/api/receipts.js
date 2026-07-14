import { getBearerToken, json, requireSession, writeOperationLog } from '../_shared/auth.js';
import { cosFailure, cosFetch } from '../_shared/cos.js';

const MAX_RECEIPT_SIZE = 12 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function cleanText(value) {
  return String(value || '').trim();
}

function receiptKeyAllowed(key, session) {
  return key.startsWith(`receipts/${session.company_id || 'tongda'}/`);
}

function extensionForType(type) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || getBearerToken(request);
  const authorizedRequest = token
    ? new Request(request, { headers: { ...Object.fromEntries(request.headers), authorization: `Bearer ${token}` } })
    : request;
  const { session, error } = await requireSession(authorizedRequest, env);
  if (error) return error;

  const key = cleanText(url.searchParams.get('key'));
  if (!key || !receiptKeyAllowed(key, session)) return json({ error: 'RECEIPT_NOT_FOUND' }, { status: 404 });

  const { response, error: cosError } = await cosFetch('GET', key, env);
  if (cosError) return cosError;
  if (!response.ok) return cosFailure(response, 'RECEIPT_READ_FAILED');

  return new Response(response.body, {
    headers: {
      'content-type': response.headers.get('content-type') || 'application/octet-stream',
      'cache-control': 'private, max-age=60',
    },
  });
}

export async function onRequestPost({ request, env }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get('file');
  const orderId = cleanText(formData.get('orderId'));
  const eventId = cleanText(formData.get('eventId'));
  const logMode = cleanText(formData.get('logMode'));
  if (!file || typeof file.arrayBuffer !== 'function' || typeof file.size !== 'number') {
    return json({ error: 'FILE_REQUIRED' }, { status: 400 });
  }
  if (!orderId) return json({ error: 'ORDER_ID_REQUIRED' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return json({ error: 'UNSUPPORTED_FILE_TYPE' }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_RECEIPT_SIZE) return json({ error: 'FILE_TOO_LARGE' }, { status: 400 });

  const currentYear = new Date().getFullYear();
  const safeOrderId = orderId.replace(/[^A-Za-z0-9_-]/g, '');
  const key = `receipts/${session.company_id || 'tongda'}/${currentYear}/${safeOrderId}-${crypto.randomUUID()}.${extensionForType(file.type)}`;
  const { response, error: cosError } = await cosFetch('PUT', key, env, {
    body: await file.arrayBuffer(),
    headers: {
      'content-type': file.type,
    },
  });
  if (cosError) return cosError;
  if (!response.ok) return cosFailure(response, 'RECEIPT_UPLOAD_FAILED');

  if (logMode !== 'defer') {
    await writeOperationLog(env, session, 'upload_receipt', 'repair_order', orderId, file.name, {
      eventId,
      summary: `补传到账回执：${file.name}`,
      changes: [{ field: 'settlement_receipt', label: '到账回执', before: '', after: file.name }],
    });
  }

  return json({
    receipt: {
      key,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    },
  });
}

export async function onRequestDelete({ request, env }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;

  const payload = await request.json().catch(() => ({}));
  const key = cleanText(payload.key);
  const orderId = cleanText(payload.orderId);
  const eventId = cleanText(payload.eventId);
  if (!key || !receiptKeyAllowed(key, session)) return json({ error: 'RECEIPT_NOT_FOUND' }, { status: 404 });

  const { response, error: cosError } = await cosFetch('DELETE', key, env);
  if (cosError) return cosError;
  if (!response.ok && response.status !== 404) return cosFailure(response, 'RECEIPT_DELETE_FAILED');

  await writeOperationLog(env, session, 'delete_receipt', 'repair_order', orderId, key, {
    eventId,
    summary: '删除到账回执',
    changes: [{ field: 'settlement_receipt', label: '到账回执', before: key, after: '' }],
  });

  return json({ ok: true });
}
