import { json, requireSession, writeOperationLog } from '../../../_shared/auth.js';
import { readCapabilities } from '../../../_shared/order-foundation.js';

export async function onRequestPost({ request, env, params }) {
  const { session, error } = await requireSession(request, env, { permission: 'voidOrder' });
  if (error) return error;
  if (!(await readCapabilities(env, session)).includes('VOID_ORDER')) {
    return json({ error: 'CAPABILITY_DISABLED' }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const reason = String(payload.reason || '').trim();
  const id = String(params.id || '').trim();

  if (!id) {
    return json({ error: 'ORDER_ID_REQUIRED' }, { status: 400 });
  }

  const order = await env.DB.prepare(
    'SELECT id, plate, customer FROM repair_orders WHERE id = ? AND company_id = ? AND voided = 0',
  ).bind(id, session.company_id || 'tongda').first();

  if (!order) {
    return json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
  }

  await env.DB.prepare(`
    UPDATE repair_orders
    SET voided = 1, voided_at = CURRENT_TIMESTAMP, void_reason = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND company_id = ?
  `).bind(reason || 'admin voided', id, session.company_id || 'tongda').run();

  await writeOperationLog(env, session, 'void_order', 'repair_order', id, `${order.plate} ${order.customer}`);

  return json({ ok: true });
}
