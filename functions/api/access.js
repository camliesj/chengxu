import { createAccountSession, createSession, json, requireSession } from '../_shared/auth.js';

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const companyId = String(payload.companyId || 'tongda').trim();
  const username = String(payload.username || '').trim();
  const password = String(payload.password || '').trim();

  if (username || password) {
    if (!companyId || !username || !password) {
      return json({ error: 'ACCOUNT_REQUIRED' }, { status: 400 });
    }
    const session = await createAccountSession(env, { companyId, username, password });
    if (!session) {
      return json({ error: 'INVALID_ACCOUNT' }, { status: 401 });
    }
    return json({ session });
  }

  const code = String(payload.code || '').trim();
  if (!code) {
    return json({ error: 'CODE_REQUIRED' }, { status: 400 });
  }

  const session = await createSession(env, code, companyId);
  if (!session) {
    return json({ error: 'INVALID_CODE' }, { status: 401 });
  }

  return json({ session });
}

export async function onRequestGet({ request, env }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;
  return json({
    session: {
      role: session.role,
      label: session.label,
      companyId: session.company_id,
      username: session.username,
      displayName: session.display_name,
    },
  });
}
