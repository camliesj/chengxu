import { requireSession } from '../../../_shared/auth.js';
import { handleSettlementCommand } from '../../../_shared/order-settlement.js';

export async function onRequestPost({ request, env, params }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;
  const payload = await request.json().catch(() => ({}));
  return handleSettlementCommand({ env, session, orderId: params.id, payload });
}
