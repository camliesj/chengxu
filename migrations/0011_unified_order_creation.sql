CREATE TABLE IF NOT EXISTS order_number_sequences (
  month_key TEXT PRIMARY KEY,
  next_value INTEGER NOT NULL CHECK (next_value >= 1),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE order_operations ADD COLUMN lease_token TEXT NOT NULL DEFAULT '';
ALTER TABLE order_operations ADD COLUMN lease_until TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_order_operations_lease
  ON order_operations(state, lease_until, updated_at);
