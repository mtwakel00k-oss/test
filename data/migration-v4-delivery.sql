-- ── FILE: data/migration-v4-delivery.sql ──────────────────────────
-- Safe idempotent migration for delivery feature
-- Run in Supabase Dashboard SQL Editor for each tenant DB

-- ── 1) Rename on_the_way → out_for_delivery safely ──
UPDATE orders
SET status = 'out_for_delivery'
WHERE status = 'on_the_way';

-- ── 2) Fix status constraint ──
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'preparing',
    'ready',
    'out_for_delivery',
    'completed',
    'cancelled'
  ));

-- ── 3) Add delivery columns if missing ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat     DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng     DOUBLE PRECISION;

-- ── 4) Ensure order_type constraint is correct ──
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check
  CHECK (order_type IN ('dine_in', 'takeaway', 'delivery'));

-- ── 5) Fix any bad order_type data from old string values ──
UPDATE orders SET order_type = 'dine_in'  WHERE order_type NOT IN ('dine_in','takeaway','delivery');

-- ── 6) Index for delivery queries ──
CREATE INDEX IF NOT EXISTS idx_orders_type_status
  ON orders(order_type, status)
  WHERE status NOT IN ('completed', 'cancelled');
