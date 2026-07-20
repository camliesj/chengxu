ALTER TABLE repair_orders ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS order_operations (
  company_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  target_id TEXT NOT NULL DEFAULT '',
  request_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('started', 'completed', 'failed')),
  http_status INTEGER NOT NULL DEFAULT 0,
  response_json TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, actor, action, operation_id)
);

CREATE TABLE IF NOT EXISTS company_capabilities (
  company_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_repair_orders_company_updated
  ON repair_orders(company_id, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_repair_orders_company_status_updated
  ON repair_orders(company_id, status, voided, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_order_operations_target
  ON order_operations(company_id, target_id, updated_at DESC);

INSERT OR IGNORE INTO company_capabilities(company_id, capability, enabled)
SELECT DISTINCT company_id, 'VIEW_ORDERS', 1 FROM repair_orders;
