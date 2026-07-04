import { json, requireSession, sha256Hex, writeOperationLog } from '../_shared/auth.js';

const ROLE_LABELS = {
  admin: '管理员',
  staff: '员工',
};

export async function onRequestPost({ request, env }) {
  const { session, error } = await requireSession(request, env, { adminOnly: true });
  if (error) return error;

  const payload = await request.json().catch(() => ({}));
  const role = String(payload.role || '').trim();
  const code = String(payload.code || '').trim();

  if (!ROLE_LABELS[role]) {
    return json({ error: 'INVALID_ROLE' }, { status: 400 });
  }

  if (!/^\d{4,12}$/.test(code)) {
    return json({ error: 'CODE_MUST_BE_4_TO_12_DIGITS' }, { status: 400 });
  }

  const codeHash = await sha256Hex(code);
  await env.DB.prepare(`
    INSERT INTO access_codes (code_hash, role, label, is_active)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(code_hash) DO UPDATE SET role = excluded.role, label = excluded.label, is_active = 1
  `).bind(codeHash, role, ROLE_LABELS[role]).run();

  await env.DB.prepare('UPDATE access_codes SET is_active = 0 WHERE role = ? AND code_hash <> ?')
    .bind(role, codeHash)
    .run();

  await writeOperationLog(env, session, 'update_access_code', 'access_code', role, ROLE_LABELS[role]);

  return json({ ok: true, role, label: ROLE_LABELS[role] });
}
