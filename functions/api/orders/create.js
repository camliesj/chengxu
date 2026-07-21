import { requireSession } from '../../_shared/auth.js';
import { handleCreateOrderCommand } from '../../_shared/order-creation.js';

export async function onRequestPost({ request, env }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;
  const payload = await request.json().catch(() => ({}));
  return handleCreateOrderCommand({ env, session, payload });
}
