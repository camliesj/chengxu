import { requireSession } from '../../../_shared/auth.js';
import { readEditOrderOperation } from '../../../_shared/order-edit.js';

export async function onRequestGet({ request, env, params }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;
  return readEditOrderOperation({ env, session, operationId: params.operationId });
}
