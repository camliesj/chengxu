ALTER TABLE operation_logs ADD COLUMN event_id TEXT NOT NULL DEFAULT '';
ALTER TABLE operation_logs ADD COLUMN summary TEXT NOT NULL DEFAULT '';
ALTER TABLE operation_logs ADD COLUMN changes TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_operation_logs_event_id
ON operation_logs (event_id)
WHERE event_id <> '';
