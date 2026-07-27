ALTER TABLE insurance_policies ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS insurance_policy_operations (
  company_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (company_id, operation_id)
);
