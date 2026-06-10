-- ============================================================
-- Migration: Add RLS policy for public order tracking
-- Run this in each tenant's Supabase project SQL editor
-- ============================================================
-- Ensures anonymous users (customers with only the order UUID)
-- can SELECT an order and its items for tracking.
-- Also ensures the API server's service role can READ orders.

-- ── orders ────────────────────────────────────────────────────
-- Allows anonymous SELECT by order id (customer tracking)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_public" ON orders;
CREATE POLICY "orders_select_public" ON orders
  FOR SELECT USING (true);

-- ── order_items ───────────────────────────────────────────────
-- Required so the tracking page can list items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_select_public" ON order_items;
CREATE POLICY "order_items_select_public" ON order_items
  FOR SELECT USING (true);
