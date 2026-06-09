-- Migration v8: Cashier tracking
-- Run this in each tenant's Supabase DB (e.g. via /api/run-sql?slug=burger-house)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier_name TEXT;
