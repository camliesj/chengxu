import { requireSession } from '../../../_shared/auth.js';
import { readStatusOperation } from '../../../_shared/order-status.js';

export async function onRequestGet({ request, env, params }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;
  return readStatusOperation({ env, session, operationId: params.operationId });
}
