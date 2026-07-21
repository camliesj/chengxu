import { json, requireSession } from '../_shared/auth.js';
import { buildOrderCreationMetadata } from '../_shared/order-creation.js';
import { readCapabilities } from '../_shared/order-foundation.js';

export async function onRequestGet({ request, env }) {
  const { session, error } = await requireSession(request, env);
  if (error) return error;

  const companyId = session.company_id || 'tongda';
  const capabilities = await readCapabilities(env, session);
  const dictionaries = await env.DB.prepare(`
    SELECT id, category, value, extra, sort_order
    FROM system_dictionaries
    WHERE company_id = ? AND is_active = 1 AND category IN ('insurer', 'staff')
    ORDER BY category ASC, sort_order ASC, created_at ASC
  `).bind(companyId).all();
  const metadata = buildOrderCreationMetadata(dictionaries.results || []);

  return json({
    metadata,
    capabilities,
    canCreate: capabilities.includes('CREATE_ORDER'),
    serverTime: new Date().toISOString(),
  });
}
