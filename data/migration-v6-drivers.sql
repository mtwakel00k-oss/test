-- ── 1) Add drivers JSONB column to Master DB tenants ──
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS drivers JSONB DEFAULT '[]'::jsonb;

-- ── 2) Add delivery/driver columns to TENANT DB ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='driver_id')
  THEN ALTER TABLE orders ADD COLUMN driver_id TEXT; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='delivery_lat')
  THEN ALTER TABLE orders ADD COLUMN delivery_lat DOUBLE PRECISION; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='delivery_lng')
  THEN ALTER TABLE orders ADD COLUMN delivery_lng DOUBLE PRECISION; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='delivery_address')
  THEN ALTER TABLE orders ADD COLUMN delivery_address TEXT; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='orders' AND column_name='payment_method')
  THEN
    ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'cash_on_delivery';
    ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
      CHECK (payment_method IN ('cash_on_delivery'));
  END IF;
END $$;

-- ── 3) Update ALLOWED_STATUSES ──
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','preparing','ready','out_for_delivery','completed','cancelled'));

UPDATE orders SET status = 'out_for_delivery' WHERE status = 'on_the_way';
