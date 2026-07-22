import { hasPermission } from './auth.js';

export { beginOperation, completeOperation, findOperation } from './order-command-operation.js';

export const BUSINESS_CAPABILITIES = [
  'VIEW_ORDERS',
  'CREATE_ORDER',
  'EDIT_ORDER',
  'ADVANCE_ORDER_STATUS',
  'VIEW_RECORDS',
  'MANAGE_RECORDS',
  'SETTLE_ORDER',
  'REVERSE_SETTLEMENT',
  'VOID_ORDER',
  'MAINTAIN_RECEIPT',
  'EXPORT_DATA',
];

const SAFE_DEFAULT_CAPABILITIES = new Set(['VIEW_ORDERS']);
const CURSOR_MODES = new Set(['full', 'delta']);
const CURSOR_SCOPES = new Set(['current', 'history']);

export function encodeOrderCursor(value) {
  validateCursor(value);
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

export function decodeOrderCursor(value) {
  try {
    const normalized = String(value || '').replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes));
    validateCursor(decoded);
    return decoded;
  } catch {
    return null;
  }
}

export async function readCapabilities(env, session) {
  const result = await env.DB.prepare(`
    SELECT capability, enabled
    FROM company_capabilities
    WHERE company_id = ? AND enabled = 1
    ORDER BY capability ASC
  `).bind(session?.company_id || 'tongda').all();
  const enabled = new Set(SAFE_DEFAULT_CAPABILITIES);
  for (const row of result.results || []) {
    if (Number(row.enabled) === 1 && BUSINESS_CAPABILITIES.includes(row.capability)) {
      enabled.add(row.capability);
    }
  }
  return BUSINESS_CAPABILITIES.filter(
    (capability) => enabled.has(capability) && roleAllowsCapability(session, capability),
  );
}

function validateCursor(value) {
  if (!value || !CURSOR_MODES.has(value.mode)) throw new TypeError('Invalid cursor mode');
  if (!CURSOR_SCOPES.has(value.scope)) throw new TypeError('Invalid cursor scope');
  if (typeof value.updatedAt !== 'string' || !value.updatedAt.trim()) {
    throw new TypeError('Invalid cursor timestamp');
  }
  if (typeof value.id !== 'string' || !value.id.trim()) throw new TypeError('Invalid cursor id');
}

function roleAllowsCapability(session, capability) {
  if (session?.role === 'admin') return true;
  switch (capability) {
    case 'VIEW_ORDERS':
    case 'CREATE_ORDER':
    case 'EDIT_ORDER':
    case 'ADVANCE_ORDER_STATUS':
      return hasPermission(session, 'repair');
    case 'VIEW_RECORDS':
      return ['history', 'insurance', 'customers'].some((permission) => hasPermission(session, permission));
    default:
      return false;
  }
}
