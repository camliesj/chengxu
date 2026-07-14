import { json, requireSession, writeOperationLog } from '../_shared/auth.js';
import { normalizeCloudRecord, parseCloudRows } from '../_shared/cloud-records.js';

const MAX_IMPORT_RECORDS = 1000;

async function readVehicles(env, companyId) {
  const result = await env.DB.prepare(`
    SELECT record_json
    FROM customer_vehicles
    WHERE company_id = ?
    ORDER BY updated_at DESC
  `).bind(companyId).all();
  return parseCloudRows(result.results || []);
}

export async function onRequestGet({ request, env }) {
  const { session, error } = await requireSession(request, env, { permission: 'customers' });
  if (error) return error;
  return json({ vehicles: await readVehicles(env, session.company_id || 'tongda') });
}

export async function onRequestPost({ request, env }) {
  const { session, error } = await requireSession(request, env, { permission: 'customers' });
  if (error) return error;

  const payload = await request.json().catch(() => ({}));
  const companyId = session.company_id || 'tongda';

  if (payload.action === 'import') {
    if (session.role !== 'admin') return json({ error: 'ADMIN_REQUIRED' }, { status: 403 });
    if (!Array.isArray(payload.records) || payload.records.length > MAX_IMPORT_RECORDS) {
      return json({ error: 'INVALID_IMPORT_RECORDS' }, { status: 400 });
    }

    let records;
    try {
      records = payload.records.map((record) => normalizeCloudRecord(record, companyId));
    } catch (recordError) {
      return json({ error: recordError.message }, { status: 400 });
    }

    if (records.length > 0) {
      await env.DB.batch(records.map((record) => env.DB.prepare(`
        INSERT OR IGNORE INTO customer_vehicles (company_id, id, record_json)
        VALUES (?, ?, ?)
      `).bind(companyId, record.id, JSON.stringify(record))));
    }
    await writeOperationLog(env, session, 'import_customer_vehicles', 'customer_vehicle', companyId, `导入 ${records.length} 条历史客户车辆档案`);
    return json({ ok: true, vehicles: await readVehicles(env, companyId) });
  }

  let vehicle;
  try {
    vehicle = normalizeCloudRecord(payload.vehicle || payload, companyId);
  } catch (recordError) {
    return json({ error: recordError.message }, { status: 400 });
  }

  await env.DB.prepare(`
    INSERT INTO customer_vehicles (company_id, id, record_json)
    VALUES (?, ?, ?)
    ON CONFLICT(company_id, id) DO UPDATE SET
      record_json = excluded.record_json,
      updated_at = datetime('now')
  `).bind(companyId, vehicle.id, JSON.stringify(vehicle)).run();
  await writeOperationLog(env, session, 'save_customer_vehicle', 'customer_vehicle', vehicle.id, `${vehicle.plate || ''} ${vehicle.customer || ''}`.trim());
  return json({ ok: true, vehicle });
}
