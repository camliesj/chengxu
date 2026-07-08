ALTER TABLE repair_orders ADD COLUMN company_id TEXT NOT NULL DEFAULT 'tongda';
ALTER TABLE access_sessions ADD COLUMN company_id TEXT NOT NULL DEFAULT 'tongda';
ALTER TABLE access_sessions ADD COLUMN username TEXT NOT NULL DEFAULT '';
ALTER TABLE access_sessions ADD COLUMN display_name TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  label TEXT NOT NULL,
  display_name TEXT NOT NULL,
  company_id TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO accounts (id, username, password_hash, role, label, display_name, company_id, is_active)
VALUES
  ('acct-admin', 'admin', 'a9e6838e46e6a2ade1b48f768550ddb70f4bc76babaf6fa7e83818074fe394b5', 'admin', '管理员', '管理员', '', 1),
  ('acct-tongda', 'tongda', '77e55af9347a8eb9c95c69b95c5ee3d6958fa9f17c9e3f7397864cebde862d30', 'staff', '通达员工', '通达员工', 'tongda', 1),
  ('acct-xinqiheng', 'xinqiheng', '16cb46f33ffc436e9b640139df36354b068f7083ac649e6dcd526062d744fdf6', 'staff', '鑫齐恒员工', '鑫齐恒员工', 'xinqiheng', 1);

CREATE INDEX IF NOT EXISTS idx_repair_orders_company ON repair_orders (company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts (company_id);
