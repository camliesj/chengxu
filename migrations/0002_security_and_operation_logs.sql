CREATE TABLE IF NOT EXISTS access_codes (
  code_hash TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  label TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_sessions (
  token TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE repair_orders ADD COLUMN voided INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repair_orders ADD COLUMN voided_at TEXT NOT NULL DEFAULT '';
ALTER TABLE repair_orders ADD COLUMN void_reason TEXT NOT NULL DEFAULT '';

INSERT OR REPLACE INTO access_codes (code_hash, role, label, is_active)
VALUES
  ('92925488b28ab12584ac8fcaa8a27a0f497b2c62940c8f4fbc8ef19ebc87c43e', 'admin', '管理员', 1),
  ('94edf28c6d6da38fd35d7ad53e485307f89fbeaf120485c8d17a43f323deee71', 'staff', '员工', 1);

CREATE INDEX IF NOT EXISTS idx_access_sessions_expires_at ON access_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_operation_logs_target ON operation_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_repair_orders_voided ON repair_orders (voided);
