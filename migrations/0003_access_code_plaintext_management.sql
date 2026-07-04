ALTER TABLE access_codes ADD COLUMN code_value TEXT NOT NULL DEFAULT '';

UPDATE access_codes
SET code_value = '888888'
WHERE code_hash = '92925488b28ab12584ac8fcaa8a27a0f497b2c62940c8f4fbc8ef19ebc87c43e';

UPDATE access_codes
SET code_value = '666666'
WHERE code_hash = '94edf28c6d6da38fd35d7ad53e485307f89fbeaf120485c8d17a43f323deee71';
