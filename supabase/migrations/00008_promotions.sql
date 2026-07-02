-- Migration 00008: Promotions & Discounts System
-- Run this in the tenant's Supabase Dashboard SQL Editor.

-- Promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id BIGSERIAL PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  code TEXT,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed', 'bogo')),
  value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  applicable_to TEXT DEFAULT 'all' CHECK (applicable_to IN ('all', 'specific')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_slug, code)
);

-- Pivot table for promotions that apply only to specific products
CREATE TABLE IF NOT EXISTS promotion_products (
  promotion_id BIGINT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL,
  PRIMARY KEY (promotion_id, product_id)
);

-- Add discount columns to existing orders table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_amount') THEN
    ALTER TABLE orders ADD COLUMN discount_amount NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_type') THEN
    ALTER TABLE orders ADD COLUMN discount_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_label') THEN
    ALTER TABLE orders ADD COLUMN discount_label TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'promotion_id') THEN
    ALTER TABLE orders ADD COLUMN promotion_id BIGINT;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promotions_tenant_slug ON promotions(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(tenant_slug, code);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(tenant_slug, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_discount ON orders(promotion_id);
