import { hasPermission, json, requireSession, writeOperationLog } from '../_shared/auth.js';

const CATEGORIES = ['insurer', 'staff'];

function cleanText(value) {
  return String(value || '').trim();
}

function toDictionary(row) {
  return {
    id: row.id,
    companyId: row.company_id,
    category: row.category,
    value: row.value,
    extra: row.extra || '',
    isActive: row.is_active === 1,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
  };
}

export async function onRequestGet({ request, env }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;

  const result = await env.DB.prepare(`
    SELECT id, company_id, category, value, extra, is_active, sort_order, created_at
    FROM system_dictionaries
    WHERE company_id = ?
    ORDER BY category ASC, sort_order ASC, created_at ASC
  `).bind(session.company_id || 'tongda').all();

  return json({ dictionaries: (result.results || []).map(toDictionary) });
}

export async function onRequestPost({ request, env }) {
  const { session, error } = await requireSession(request, env, { permission: 'settings' });
  if (error) return error;

  const payload = await request.json().catch(() => ({}));
  if (session.role !== 'admin' && !hasPermission(session, 'settings')) {
    return json({ error: 'PERMISSION_REQUIRED' }, { status: 403 });
  }

  if (payload.action === 'delete') {
    const id = cleanText(payload.id);
    if (!id) return json({ error: 'DICTIONARY_ID_REQUIRED' }, { status: 400 });
    const target = await env.DB.prepare('SELECT id, category, value, extra FROM system_dictionaries WHERE id = ? AND company_id = ?')
      .bind(id, session.company_id || 'tongda')
      .first();
    if (!target) return json({ error: 'DICTIONARY_NOT_FOUND' }, { status: 404 });
    await env.DB.prepare('DELETE FROM system_dictionaries WHERE id = ? AND company_id = ?')
      .bind(id, session.company_id || 'tongda')
      .run();
    await writeOperationLog(env, session, 'delete_dictionary', 'dictionary', target.category, `${target.value} ${target.extra || ''}`.trim());
    return json({ ok: true });
  }

  const category = cleanText(payload.category);
  const value = cleanText(payload.value);
  const extra = cleanText(payload.extra);
  const sortOrder = Number(payload.sortOrder) || 0;
  const isActive = payload.isActive === false ? 0 : 1;
  const id = cleanText(payload.id) || `dict-${crypto.randomUUID()}`;

  if (!CATEGORIES.includes(category)) return json({ error: 'INVALID_CATEGORY' }, { status: 400 });
  if (!value) return json({ error: 'DICTIONARY_VALUE_REQUIRED' }, { status: 400 });
  if (category === 'staff' && !extra) return json({ error: 'STAFF_NAME_REQUIRED' }, { status: 400 });

  await env.DB.prepare(`
    INSERT INTO system_dictionaries (id, company_id, category, value, extra, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      value = excluded.value,
      extra = excluded.extra,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order
  `).bind(id, session.company_id || 'tongda', category, value, extra, isActive, sortOrder).run();

  await writeOperationLog(env, session, payload.id ? 'update_dictionary' : 'create_dictionary', 'dictionary', category, `${value} ${extra}`.trim());

  return json({
    ok: true,
    dictionary: {
      id,
      companyId: session.company_id || 'tongda',
      category,
      value,
      extra,
      isActive: isActive === 1,
      sortOrder,
    },
  });
}
