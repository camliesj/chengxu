CREATE TABLE IF NOT EXISTS insurance_policies (
  company_id TEXT NOT NULL,
  id TEXT NOT NULL,
  record_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (company_id, id)
);

CREATE TABLE IF NOT EXISTS customer_vehicles (
  company_id TEXT NOT NULL,
  id TEXT NOT NULL,
  record_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (company_id, id)
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_company_updated
  ON insurance_policies(company_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_vehicles_company_updated
  ON customer_vehicles(company_id, updated_at DESC);
