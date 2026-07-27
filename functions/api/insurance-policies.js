import { json, requireSession, sha256Hex, writeOperationLog } from '../_shared/auth.js';
import { normalizeCloudRecord, parseCloudRows } from '../_shared/cloud-records.js';

const MAX_IMPORT_RECORDS = 1000;

async function readPolicies(env, companyId) {
  const result = await env.DB.prepare(`SELECT record_json, version, updated_at FROM insurance_policies WHERE company_id = ? ORDER BY updated_at DESC`).bind(companyId).all();
  return parseCloudRows(result.results || []).map((record, index) => ({ ...record, version: Number(result.results[index]?.version) || 1, updatedAt: result.results[index]?.updated_at || '' }));
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
  if (payload.action === 'import') return importPolicies(env, session, payload, companyId);
  const operationId = String(payload.operationId || '').trim();
  if (!operationId) return json({ error: 'OPERATION_ID_REQUIRED' }, { status: 400 });
  let policy;
  try { policy = normalizeCloudRecord(payload.policy || payload, companyId); } catch (e) { return json({ error: e.message }, { status: 400 }); }
  const expectedVersion = payload.expectedVersion === null ? null : Number(payload.expectedVersion);
  if (expectedVersion !== null && (!Number.isInteger(expectedVersion) || expectedVersion < 1)) return json({ error: 'EXPECTED_VERSION_INVALID' }, { status: 400 });
  const requestHash = await sha256Hex(JSON.stringify({ policy, expectedVersion }));
  const existingOperation = await env.DB.prepare('SELECT request_hash, result_json FROM insurance_policy_operations WHERE company_id = ? AND operation_id = ?').bind(companyId, operationId).first();
  if (existingOperation) {
    if (existingOperation.request_hash !== requestHash) return json({ error: 'OPERATION_ID_REUSED' }, { status: 409 });
    return json(JSON.parse(existingOperation.result_json));
  }
  const row = await env.DB.prepare('SELECT version FROM insurance_policies WHERE company_id = ? AND id = ?').bind(companyId, policy.id).first();
  const actualVersion = row?.version == null ? null : Number(row.version);
  if (actualVersion !== expectedVersion) return json({ error: 'VERSION_CONFLICT', policy: actualVersion === null ? null : (await readPolicies(env, companyId)).find((item) => item.id === policy.id) }, { status: 409 });
  const version = (actualVersion || 0) + 1;
  const saved = { ...policy, version, updatedAt: new Date().toISOString() };
  const response = { ok: true, policy: saved };
  await env.DB.batch([
    env.DB.prepare('INSERT INTO insurance_policies (company_id, id, record_json, version, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\')) ON CONFLICT(company_id, id) DO UPDATE SET record_json = excluded.record_json, version = excluded.version, updated_at = datetime(\'now\')').bind(companyId, policy.id, JSON.stringify(policy), version),
    env.DB.prepare('INSERT INTO insurance_policy_operations (company_id, operation_id, request_hash, result_json) VALUES (?, ?, ?, ?)').bind(companyId, operationId, requestHash, JSON.stringify(response)),
  ]);
  await writeOperationLog(env, session, 'save_insurance_policy', 'insurance_policy', policy.id, `${policy.plate || ''} ${policy.customer || ''}`.trim());
  return json(response, { status: actualVersion === null ? 201 : 200 });
}

export async function onRequestDelete({ request, env, params }) {
  const { session, error } = await requireSession(request, env, { permission: 'insurance' });
  if (error) return error;
  const payload = await request.json().catch(() => ({}));
  const id = String(params?.id || payload.id || '').trim();
  const expectedVersion = Number(payload.expectedVersion);
  const operationId = String(payload.operationId || '').trim();
  if (!id || !operationId || !Number.isInteger(expectedVersion) || expectedVersion < 1) return json({ error: 'DELETE_INPUT_INVALID' }, { status: 400 });
  const companyId = session.company_id || 'tongda';
  const requestHash = await sha256Hex(JSON.stringify({ id, expectedVersion, action: 'delete' }));
  const existingOperation = await env.DB.prepare('SELECT request_hash, result_json FROM insurance_policy_operations WHERE company_id = ? AND operation_id = ?').bind(companyId, operationId).first();
  if (existingOperation) {
    if (existingOperation.request_hash !== requestHash) return json({ error: 'OPERATION_ID_REUSED' }, { status: 409 });
    return json(JSON.parse(existingOperation.result_json));
  }
  const changed = await env.DB.prepare('DELETE FROM insurance_policies WHERE company_id = ? AND id = ? AND version = ?').bind(companyId, id, expectedVersion).run();
  if (!changed.meta?.changes) return json({ error: 'VERSION_CONFLICT' }, { status: 409 });
  const response = { ok: true, id };
  await env.DB.prepare('INSERT INTO insurance_policy_operations (company_id, operation_id, request_hash, result_json) VALUES (?, ?, ?, ?)').bind(companyId, operationId, requestHash, JSON.stringify(response)).run();
  await writeOperationLog(env, session, 'delete_insurance_policy', 'insurance_policy', id);
  return json(response);
}

async function importPolicies(env, session, payload, companyId) {
  if (session.role !== 'admin') return json({ error: 'ADMIN_REQUIRED' }, { status: 403 });
  if (!Array.isArray(payload.records) || payload.records.length > MAX_IMPORT_RECORDS) return json({ error: 'INVALID_IMPORT_RECORDS' }, { status: 400 });
  let records; try { records = payload.records.map((record) => normalizeCloudRecord(record, companyId)); } catch (e) { return json({ error: e.message }, { status: 400 }); }
  if (records.length) await env.DB.batch(records.map((record) => env.DB.prepare('INSERT OR IGNORE INTO insurance_policies (company_id, id, record_json) VALUES (?, ?, ?)').bind(companyId, record.id, JSON.stringify(record))));
  await writeOperationLog(env, session, 'import_insurance_policies', 'insurance_policy', companyId, `导入 ${records.length} 条历史保险档案`);
  return json({ ok: true, policies: await readPolicies(env, companyId) });
}
