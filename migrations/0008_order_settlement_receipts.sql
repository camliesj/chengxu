ALTER TABLE repair_orders ADD COLUMN settlement_receipt_key TEXT NOT NULL DEFAULT '';
ALTER TABLE repair_orders ADD COLUMN settlement_receipt_name TEXT NOT NULL DEFAULT '';
ALTER TABLE repair_orders ADD COLUMN settlement_receipt_type TEXT NOT NULL DEFAULT '';
ALTER TABLE repair_orders ADD COLUMN settlement_receipt_size INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repair_orders ADD COLUMN settlement_receipt_uploaded_at TEXT NOT NULL DEFAULT '';
