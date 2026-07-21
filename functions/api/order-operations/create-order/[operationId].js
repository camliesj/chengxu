import { requireSession } from '../../../_shared/auth.js';
import { readCreateOrderOperation } from '../../../_shared/order-creation.js';

export async function onRequestGet({ request, env, params }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;
  return readCreateOrderOperation({
    env,
    session,
    operationId: String(params?.operationId || '').trim(),
  });
}
