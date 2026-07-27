import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const endpointUrl = new URL('../functions/api/insurance-policies.js', import.meta.url);
const deleteRouteUrl = new URL('../functions/api/insurance-policies/[id].js', import.meta.url);
const migrationUrl = new URL('../migrations/0012_unified_insurance_policies.sql', import.meta.url);

test('insurance delete is registered on the parameterized policy route', async () => {
  const route = await import(deleteRouteUrl.href);
  assert.equal(typeof route.onRequestDelete, 'function');
});

test('insurance API contract is versioned and idempotent', async () => {
  const source = await readFile(endpointUrl, 'utf8');
  assert.match(source, /expectedVersion/);
  assert.match(source, /operationId/);
  assert.match(source, /VERSION_CONFLICT/);
  assert.match(source, /OPERATION_ID_REUSED/);
  assert.match(source, /onRequestDelete/);
  assert.match(source, /action: 'delete'/);
});

test('insurance migration stores versions and per-company operations', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /ALTER TABLE insurance_policies ADD COLUMN version INTEGER NOT NULL DEFAULT 1/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS insurance_policy_operations/);
  assert.match(sql, /PRIMARY KEY \(company_id, operation_id\)/);
});
