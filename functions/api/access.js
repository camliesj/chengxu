import { createSession, json, requireSession } from '../_shared/auth.js';

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const code = String(payload.code || '').trim();
  if (!code) {
    return json({ error: 'CODE_REQUIRED' }, { status: 400 });
  }

  const session = await createSession(env, code);
  if (!session) {
    return json({ error: 'INVALID_CODE' }, { status: 401 });
  }

  return json({ session });
}

export async function onRequestGet({ request, env }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;
  return json({ session: { role: session.role, label: session.label } });
}
