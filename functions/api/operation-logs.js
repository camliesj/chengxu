import { json, requireSession } from '../_shared/auth.js';

export async function onRequestGet({ request, env }) {
  const { error } = await requireSession(request, env, { permission: 'logs' });
  if (error) return error;

  const result = await env.DB.prepare(`
    SELECT id, action, target_type, target_id, role, label, detail, created_at
    FROM operation_logs
    ORDER BY id DESC
    LIMIT 100
  `).all();

  return json({ logs: result.results });
}
