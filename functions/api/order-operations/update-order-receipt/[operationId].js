import { requireSession } from '../../../_shared/auth.js';
import { readSettlementOperation } from '../../../_shared/order-settlement.js';

export async function onRequestGet({ request, env, params }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;
  return readSettlementOperation({ env, session, action: 'update-order-receipt', operationId: params.operationId });
}
