import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../migrations/0010_android_order_foundation.sql', import.meta.url);

test('order foundation migration adds optimistic concurrency and idempotency', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /ALTER TABLE repair_orders ADD COLUMN version INTEGER NOT NULL DEFAULT 1/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS order_operations/);
  assert.match(sql, /PRIMARY KEY \(company_id, actor, action, operation_id\)/);
  assert.match(sql, /request_hash TEXT NOT NULL/);
  assert.match(sql, /state TEXT NOT NULL CHECK \(state IN \('started', 'completed', 'failed'\)\)/);
});

test('order foundation migration adds safe company capability switches and read indexes', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS company_capabilities/);
  assert.match(sql, /PRIMARY KEY \(company_id, capability\)/);
  assert.match(sql, /enabled INTEGER NOT NULL DEFAULT 0 CHECK \(enabled IN \(0, 1\)\)/);
  assert.match(sql, /idx_repair_orders_company_updated/);
  assert.match(sql, /idx_repair_orders_company_status_updated/);
  assert.match(sql, /SELECT DISTINCT company_id, 'VIEW_ORDERS', 1 FROM repair_orders/);
  assert.doesNotMatch(sql, /SELECT DISTINCT company_id, '(CREATE_ORDER|EDIT_ORDER|SETTLE_ORDER)'/);
});
