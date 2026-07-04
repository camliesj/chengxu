import { json, requireSession, sha256Hex, writeOperationLog } from '../_shared/auth.js';

const ROLE_LABELS = {
  admin: '管理员',
  staff: '员工',
};

function formatAccessCode(code) {
  return {
    id: code.code_hash,
    role: code.role,
    label: code.label,
    code: code.code_value || '',
    isActive: code.is_active === 1,
    createdAt: code.created_at,
    fingerprint: code.fingerprint,
  };
}

export async function onRequestPost({ request, env }) {
  const { session, error } = await requireSession(request, env, { adminOnly: true });
  if (error) return error;

  const payload = await request.json().catch(() => ({}));
  if (payload.action === 'unlock') {
    const adminCode = String(payload.adminCode || '').trim();
    if (!adminCode) {
      return json({ error: 'ADMIN_CODE_REQUIRED' }, { status: 400 });
    }

    const adminHash = await sha256Hex(adminCode);
    const adminAccess = await env.DB.prepare(`
      SELECT role
      FROM access_codes
      WHERE code_hash = ? AND role = 'admin' AND is_active = 1
    `).bind(adminHash).first();

    if (!adminAccess) {
      return json({ error: 'INVALID_ADMIN_CODE' }, { status: 403 });
    }

    await env.DB.prepare(`
      UPDATE access_codes
      SET code_value = ?
      WHERE code_hash = ? AND role = 'admin' AND is_active = 1 AND code_value = ''
    `).bind(adminCode, adminHash).run();

    const codes = await env.DB.prepare(`
      SELECT code_hash, role, label, code_value, is_active, created_at, substr(code_hash, -8) AS fingerprint
      FROM access_codes
      ORDER BY role ASC, is_active DESC, created_at DESC
    `).all();

    await writeOperationLog(env, session, 'unlock_access_code_panel', 'access_code', 'all', '查看访问码管理信息');

    return json({
      ok: true,
      codes: (codes.results || []).map(formatAccessCode),
    });
  }

  if (payload.action === 'delete') {
    const id = String(payload.id || '').trim();
    if (!id) {
      return json({ error: 'ACCESS_CODE_ID_REQUIRED' }, { status: 400 });
    }

    const target = await env.DB.prepare('SELECT role, is_active FROM access_codes WHERE code_hash = ?').bind(id).first();
    if (!target) {
      return json({ error: 'ACCESS_CODE_NOT_FOUND' }, { status: 404 });
    }

    if (target.role === 'admin' && target.is_active === 1) {
      const activeAdmin = await env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM access_codes
        WHERE role = 'admin' AND is_active = 1
      `).first();
      if (Number(activeAdmin?.count || 0) <= 1) {
        return json({ error: 'CANNOT_DELETE_LAST_ADMIN_CODE' }, { status: 400 });
      }
    }

    await env.DB.prepare('DELETE FROM access_codes WHERE code_hash = ?').bind(id).run();
    await writeOperationLog(env, session, 'delete_access_code', 'access_code', target.role, ROLE_LABELS[target.role] || target.role);

    return json({ ok: true });
  }

  const role = String(payload.role || '').trim();
  const code = String(payload.code || '').trim();
  const id = String(payload.id || '').trim();

  if (!ROLE_LABELS[role]) {
    return json({ error: 'INVALID_ROLE' }, { status: 400 });
  }

  if (!/^\d{4,12}$/.test(code)) {
    return json({ error: 'CODE_MUST_BE_4_TO_12_DIGITS' }, { status: 400 });
  }

  const codeHash = await sha256Hex(code);
  const target = id ? await env.DB.prepare('SELECT role, is_active FROM access_codes WHERE code_hash = ?').bind(id).first() : null;
  if (target?.role === 'admin' && target.is_active === 1 && role !== 'admin') {
    const activeAdmin = await env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM access_codes
      WHERE role = 'admin' AND is_active = 1
    `).first();
    if (Number(activeAdmin?.count || 0) <= 1) {
      return json({ error: 'CANNOT_REMOVE_LAST_ADMIN_CODE' }, { status: 400 });
    }
  }

  if (id && id !== codeHash) {
    if (target?.role === 'admin' && target.is_active === 1) {
      const activeAdmin = await env.DB.prepare(`
        SELECT COUNT(*) AS count
        FROM access_codes
        WHERE role = 'admin' AND is_active = 1
      `).first();
      if (Number(activeAdmin?.count || 0) <= 1 && role !== 'admin') {
        return json({ error: 'CANNOT_REMOVE_LAST_ADMIN_CODE' }, { status: 400 });
      }
    }
    await env.DB.prepare('DELETE FROM access_codes WHERE code_hash = ?').bind(id).run();
  }

  await env.DB.prepare(`
    INSERT INTO access_codes (code_hash, role, label, code_value, is_active)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(code_hash) DO UPDATE SET
      role = excluded.role,
      label = excluded.label,
      code_value = excluded.code_value,
      is_active = 1
  `).bind(codeHash, role, ROLE_LABELS[role], code).run();

  await env.DB.prepare('UPDATE access_codes SET is_active = 0 WHERE role = ? AND code_hash <> ?')
    .bind(role, codeHash)
    .run();

  await writeOperationLog(env, session, 'update_access_code', 'access_code', role, ROLE_LABELS[role]);

  return json({ ok: true, role, label: ROLE_LABELS[role] });
}
