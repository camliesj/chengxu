export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getBearerToken(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export async function createSession(env, accessCode) {
  const codeHash = await sha256Hex(accessCode);
  const code = await env.DB.prepare(
    'SELECT role, label FROM access_codes WHERE code_hash = ? AND is_active = 1',
  ).bind(codeHash).first();

  if (!code) return null;

  const token = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO access_sessions (token, role, label, expires_at)
    VALUES (?, ?, ?, datetime('now', '+12 hours'))
  `).bind(token, code.role, code.label).run();

  return { token, role: code.role, label: code.label };
}

export async function requireSession(request, env, options = {}) {
  const token = getBearerToken(request);
  if (!token) {
    return { error: json({ error: 'UNAUTHORIZED' }, { status: 401 }) };
  }

  const session = await env.DB.prepare(`
    SELECT token, role, label
    FROM access_sessions
    WHERE token = ? AND expires_at > datetime('now')
  `).bind(token).first();

  if (!session) {
    return { error: json({ error: 'SESSION_EXPIRED' }, { status: 401 }) };
  }

  if (options.adminOnly && session.role !== 'admin') {
    return { error: json({ error: 'ADMIN_REQUIRED' }, { status: 403 }) };
  }

  return { session };
}

export async function writeOperationLog(env, session, action, targetType, targetId = '', detail = '') {
  await env.DB.prepare(`
    INSERT INTO operation_logs (action, target_type, target_id, role, label, detail)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    action,
    targetType,
    targetId,
    session?.role || '',
    session?.label || '',
    detail,
  ).run();
}
