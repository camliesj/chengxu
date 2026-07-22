import { json, requireSession } from '../../../_shared/auth.js';
import { handleEditOrderCommand } from '../../../_shared/order-edit.js';
import { readCapabilities } from '../../../_shared/order-foundation.js';
import { toMobileOrder } from '../../orders.js';

export async function onRequestGet({ request, env, params }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;

  const order = await env.DB.prepare(
    'SELECT * FROM repair_orders WHERE id = ? AND company_id = ? AND voided = 0',
  ).bind(String(params.id || ''), session.company_id || 'tongda').first();
  if (!order) return json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
  return json({
    order: toMobileOrder(order),
    serverTime: new Date().toISOString(),
    capabilities: await readCapabilities(env, session),
  });
}

export async function onRequestPatch(context) {
  const { session, error } = await requireSession(context.request, context.env);
  if (error) return error;
  const payload = await context.request.json().catch(() => ({}));
  return handleEditOrderCommand({
    env: context.env,
    session,
    orderId: context.params.id,
    payload,
  });
}
