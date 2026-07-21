import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../migrations/0011_unified_order_creation.sql', import.meta.url);

test('unified order creation migration adds an atomic monthly number sequence', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS order_number_sequences/);
  assert.match(sql, /month_key TEXT PRIMARY KEY/);
  assert.match(sql, /next_value INTEGER NOT NULL/);
  assert.match(sql, /CHECK \(next_value >= 1\)/);
  assert.match(sql, /updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP/);
});

test('unified order creation migration adds operation lease recovery without enabling writes', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /ALTER TABLE order_operations ADD COLUMN lease_token TEXT NOT NULL DEFAULT ''/);
  assert.match(sql, /ALTER TABLE order_operations ADD COLUMN lease_until TEXT NOT NULL DEFAULT ''/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_order_operations_lease/);
  assert.match(sql, /ON order_operations\(state, lease_until, updated_at\)/);
  assert.doesNotMatch(sql, /['"]CREATE_ORDER['"]\s*,\s*1/);
  assert.doesNotMatch(sql, /DELETE\s+FROM\s+(repair_orders|order_operations|company_capabilities)/i);
  assert.doesNotMatch(sql, /DROP\s+(TABLE|COLUMN)/i);
});
