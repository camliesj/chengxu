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

export async function createSession(env, accessCode, companyId = 'tongda') {
  const codeHash = await sha256Hex(accessCode);
  const code = await env.DB.prepare(
    'SELECT role, label FROM access_codes WHERE code_hash = ? AND is_active = 1',
  ).bind(codeHash).first();

  if (!code) return null;

  const token = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO access_sessions (token, role, label, company_id, username, display_name, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+12 hours'))
  `).bind(token, code.role, code.label, companyId || 'tongda', '', code.label).run();

  return { token, role: code.role, label: code.label, companyId: companyId || 'tongda', username: '', displayName: code.label };
}

export async function createAccountSession(env, { companyId, username, password }) {
  const passwordHash = await sha256Hex(password);
  const account = await env.DB.prepare(`
    SELECT username, role, label, display_name, company_id
    FROM accounts
    WHERE username = ? AND password_hash = ? AND is_active = 1
  `).bind(username, passwordHash).first();

  if (!account) return null;
  if (account.role !== 'admin' && account.company_id !== companyId) return null;

  const token = crypto.randomUUID();
  const sessionCompany = companyId || account.company_id || 'tongda';
  await env.DB.prepare(`
    INSERT INTO access_sessions (token, role, label, company_id, username, display_name, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+12 hours'))
  `).bind(token, account.role, account.label, sessionCompany, account.username, account.display_name).run();

  return {
    token,
    role: account.role,
    label: account.label,
    companyId: sessionCompany,
    username: account.username,
    displayName: account.display_name,
  };
}

export async function requireSession(request, env, options = {}) {
  const token = getBearerToken(request);
  if (!token) {
    return { error: json({ error: 'UNAUTHORIZED' }, { status: 401 }) };
  }

  const session = await env.DB.prepare(`
    SELECT token, role, label, company_id, username, display_name
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
