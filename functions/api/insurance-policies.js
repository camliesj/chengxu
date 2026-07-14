import { json, requireSession, writeOperationLog } from '../_shared/auth.js';
import { normalizeCloudRecord, parseCloudRows } from '../_shared/cloud-records.js';

const MAX_IMPORT_RECORDS = 1000;

async function readPolicies(env, companyId) {
  const result = await env.DB.prepare(`
    SELECT record_json
    FROM insurance_policies
    WHERE company_id = ?
    ORDER BY updated_at DESC
  `).bind(companyId).all();
  return parseCloudRows(result.results || []);
}

export async function onRequestGet({ request, env }) {
  const { session, error } = await requireSession(request, env, { permission: 'insurance' });
  if (error) return error;
  return json({ policies: await readPolicies(env, session.company_id || 'tongda') });
}

export async function onRequestPost({ request, env }) {
  const { session, error } = await requireSession(request, env, { permission: 'insurance' });
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
        INSERT OR IGNORE INTO insurance_policies (company_id, id, record_json)
        VALUES (?, ?, ?)
      `).bind(companyId, record.id, JSON.stringify(record))));
    }
    await writeOperationLog(env, session, 'import_insurance_policies', 'insurance_policy', companyId, `导入 ${records.length} 条历史保险档案`);
    return json({ ok: true, policies: await readPolicies(env, companyId) });
  }

  let policy;
  try {
    policy = normalizeCloudRecord(payload.policy || payload, companyId);
  } catch (recordError) {
    return json({ error: recordError.message }, { status: 400 });
  }

  await env.DB.prepare(`
    INSERT INTO insurance_policies (company_id, id, record_json)
    VALUES (?, ?, ?)
    ON CONFLICT(company_id, id) DO UPDATE SET
      record_json = excluded.record_json,
      updated_at = datetime('now')
  `).bind(companyId, policy.id, JSON.stringify(policy)).run();
  await writeOperationLog(env, session, 'save_insurance_policy', 'insurance_policy', policy.id, `${policy.plate || ''} ${policy.customer || ''}`.trim());
  return json({ ok: true, policy });
}
