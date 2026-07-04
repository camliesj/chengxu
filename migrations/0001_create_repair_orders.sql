CREATE TABLE IF NOT EXISTS repair_orders (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  plate TEXT NOT NULL,
  customer TEXT NOT NULL,
  phone TEXT NOT NULL,
  car TEXT NOT NULL,
  insurer TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  labor REAL NOT NULL DEFAULT 0,
  material REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  record TEXT NOT NULL,
  staff TEXT NOT NULL,
  delivery TEXT NOT NULL,
  vin TEXT NOT NULL DEFAULT '',
  claim_no TEXT NOT NULL DEFAULT '',
  accident_type TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL DEFAULT '',
  remark TEXT NOT NULL DEFAULT '',
  settlement_date TEXT NOT NULL DEFAULT '',
  settlement_time TEXT NOT NULL DEFAULT '',
  settlement_remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_repair_orders_status ON repair_orders (status);
CREATE INDEX IF NOT EXISTS idx_repair_orders_plate ON repair_orders (plate);
CREATE INDEX IF NOT EXISTS idx_repair_orders_customer ON repair_orders (customer);
CREATE INDEX IF NOT EXISTS idx_repair_orders_date ON repair_orders (date);
