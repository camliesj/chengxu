import { json, requireSession, sha256Hex, writeOperationLog } from '../_shared/auth.js';

const ROLE_LABELS = {
  admin: '管理员',
  staff: '员工',
};

const COMPANY_LABELS = {
  tongda: '通达汽车服务中心',
  xinqiheng: '鑫齐恒汽车服务中心',
};

function cleanText(value) {
  return String(value || '').trim();
}

function toAccount(row) {
  return {
    id: row.id,
    username: row.username,
    password: row.password_value || '',
    role: row.role,
    label: row.label,
    displayName: row.display_name,
    companyId: row.company_id || '',
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

async function activeAdminCount(env, excludeId = '') {
  const row = await env.DB.prepare(`
    SELECT COUNT(*) AS count
    FROM accounts
    WHERE role = 'admin' AND is_active = 1 AND id <> ?
  `).bind(excludeId).first();
  return Number(row?.count || 0);
}

export async function onRequestGet({ request, env }) {
  const { error } = await requireSession(request, env, { adminOnly: true });
  if (error) return error;

  const result = await env.DB.prepare(`
    SELECT id, username, password_value, role, label, display_name, company_id, is_active, created_at
    FROM accounts
    ORDER BY role ASC, company_id ASC, created_at ASC
  `).all();

  return json({ accounts: (result.results || []).map(toAccount) });
}

export async function onRequestPost({ request, env }) {
  const { session, error } = await requireSession(request, env, { adminOnly: true });
  if (error) return error;

  const payload = await request.json().catch(() => ({}));
  if (payload.action === 'delete') {
    const id = cleanText(payload.id);
    if (!id) return json({ error: 'ACCOUNT_ID_REQUIRED' }, { status: 400 });

    const target = await env.DB.prepare('SELECT id, role, is_active, username FROM accounts WHERE id = ?').bind(id).first();
    if (!target) return json({ error: 'ACCOUNT_NOT_FOUND' }, { status: 404 });

    if (target.role === 'admin' && target.is_active === 1 && await activeAdminCount(env, id) <= 0) {
      return json({ error: 'CANNOT_DELETE_LAST_ADMIN' }, { status: 400 });
    }

    await env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(id).run();
    await writeOperationLog(env, session, 'delete_account', 'account', target.username, ROLE_LABELS[target.role] || target.role);
    return json({ ok: true });
  }

  const id = cleanText(payload.id) || `acct-${crypto.randomUUID()}`;
  const username = cleanText(payload.username);
  const password = cleanText(payload.password);
  const role = cleanText(payload.role) || 'staff';
  const companyId = role === 'admin' ? '' : cleanText(payload.companyId);
  const displayName = cleanText(payload.displayName) || username;
  const isActive = payload.isActive === false ? 0 : 1;

  if (!username) return json({ error: 'USERNAME_REQUIRED' }, { status: 400 });
  if (!password) return json({ error: 'PASSWORD_REQUIRED' }, { status: 400 });
  if (!ROLE_LABELS[role]) return json({ error: 'INVALID_ROLE' }, { status: 400 });
  if (role !== 'admin' && !COMPANY_LABELS[companyId]) return json({ error: 'INVALID_COMPANY' }, { status: 400 });
  if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) return json({ error: 'USERNAME_FORMAT_INVALID' }, { status: 400 });
  if (password.length < 6 || password.length > 32) return json({ error: 'PASSWORD_FORMAT_INVALID' }, { status: 400 });

  const existing = await env.DB.prepare('SELECT id, role, is_active FROM accounts WHERE id = ?').bind(id).first();
  if (existing?.role === 'admin' && existing.is_active === 1 && (role !== 'admin' || isActive !== 1) && await activeAdminCount(env, id) <= 0) {
    return json({ error: 'CANNOT_DISABLE_LAST_ADMIN' }, { status: 400 });
  }

  const usernameOwner = await env.DB.prepare('SELECT id FROM accounts WHERE username = ? AND id <> ?').bind(username, id).first();
  if (usernameOwner) return json({ error: 'USERNAME_EXISTS' }, { status: 409 });

  const passwordHash = await sha256Hex(password);
  const label = ROLE_LABELS[role];

  await env.DB.prepare(`
    INSERT INTO accounts (id, username, password_hash, password_value, role, label, display_name, company_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      password_hash = excluded.password_hash,
      password_value = excluded.password_value,
      role = excluded.role,
      label = excluded.label,
      display_name = excluded.display_name,
      company_id = excluded.company_id,
      is_active = excluded.is_active
  `).bind(id, username, passwordHash, password, role, label, displayName, companyId, isActive).run();

  await writeOperationLog(env, session, existing ? 'update_account' : 'create_account', 'account', username, `${label} ${displayName}`);

  return json({
    ok: true,
    account: {
      id,
      username,
      password,
      role,
      label,
      displayName,
      companyId,
      isActive: isActive === 1,
    },
  });
}
