-- Migration v9: Driver live location tracking
-- Run this in each tenant's Supabase DB (e.g. via POST /api/run-sql with body {"slug": "burger-house"})

ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_lng DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_location_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_driver_location ON orders(driver_id, status) WHERE status = 'out_for_delivery';
