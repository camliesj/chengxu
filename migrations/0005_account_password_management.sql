ALTER TABLE accounts ADD COLUMN password_value TEXT NOT NULL DEFAULT '';

UPDATE accounts SET password_value = 'admin888888' WHERE username = 'admin';
UPDATE accounts SET password_value = 'td888888' WHERE username = 'tongda';
UPDATE accounts SET password_value = 'xqh888888' WHERE username = 'xinqiheng';
