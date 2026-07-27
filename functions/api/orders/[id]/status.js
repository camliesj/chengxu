import { requireSession } from '../../../_shared/auth.js';
import { handleStatusCommand } from '../../../_shared/order-status.js';

export async function onRequestPost({ request, env, params }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;
  const payload = await request.json().catch(() => ({}));
  return handleStatusCommand({ env, session, orderId: params.id, payload });
}
