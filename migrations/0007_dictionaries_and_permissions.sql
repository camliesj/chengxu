ALTER TABLE accounts ADD COLUMN title TEXT NOT NULL DEFAULT '员工';
ALTER TABLE accounts ADD COLUMN permissions TEXT NOT NULL DEFAULT '';
ALTER TABLE access_sessions ADD COLUMN permissions TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS system_dictionaries (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  extra TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_dictionaries_scope ON system_dictionaries (company_id, category, is_active);

INSERT OR IGNORE INTO system_dictionaries (id, company_id, category, value, sort_order)
VALUES
  ('dict-tongda-insurer-1', 'tongda', 'insurer', '人保财险', 10),
  ('dict-tongda-insurer-2', 'tongda', 'insurer', '平安保险', 20),
  ('dict-tongda-insurer-3', 'tongda', 'insurer', '太平洋保险', 30),
  ('dict-tongda-insurer-4', 'tongda', 'insurer', '阳光保险', 40),
  ('dict-xinqiheng-insurer-1', 'xinqiheng', 'insurer', '人保财险', 10),
  ('dict-xinqiheng-insurer-2', 'xinqiheng', 'insurer', '平安保险', 20),
  ('dict-xinqiheng-insurer-3', 'xinqiheng', 'insurer', '太平洋保险', 30),
  ('dict-xinqiheng-insurer-4', 'xinqiheng', 'insurer', '阳光保险', 40);

INSERT OR IGNORE INTO system_dictionaries (id, company_id, category, value, extra, sort_order)
VALUES
  ('dict-tongda-staff-1', 'tongda', 'staff', '接待顾问', '张工', 10),
  ('dict-tongda-staff-2', 'tongda', 'staff', '维修顾问', '王工', 20),
  ('dict-tongda-staff-3', 'tongda', 'staff', '结算专员', '李工', 30),
  ('dict-xinqiheng-staff-1', 'xinqiheng', 'staff', '接待顾问', '张工', 10),
  ('dict-xinqiheng-staff-2', 'xinqiheng', 'staff', '维修顾问', '王工', 20),
  ('dict-xinqiheng-staff-3', 'xinqiheng', 'staff', '结算专员', '李工', 30);
