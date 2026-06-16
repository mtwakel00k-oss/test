-- ============================================================
-- STRICT RLS POLICIES — Tenant Isolation via tenant_id
-- Run in EACH tenant's Supabase project.
-- Assumes: tenant_id column exists on business tables,
--          JWT has restaurant_id claim injected by custom_jwt_claims hook.
-- ============================================================

-- FIXED: Helper extracts restaurant_id from JWT claims (key: "restaurant_id")
CREATE OR REPLACE FUNCTION get_current_restaurant_id()
RETURNS uuid AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'restaurant_id')::uuid
$$ LANGUAGE sql STABLE;

-- ── produits ───────────────────────────────────────────────────
ALTER TABLE produits ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

DROP POLICY IF EXISTS "tenant_produits_select" ON produits;
DROP POLICY IF EXISTS "tenant_produits_insert" ON produits;
DROP POLICY IF EXISTS "tenant_produits_update" ON produits;
DROP POLICY IF EXISTS "tenant_produits_delete" ON produits;

CREATE POLICY "tenant_produits_select" ON produits
  FOR SELECT USING (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_produits_insert" ON produits
  FOR INSERT WITH CHECK (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_produits_update" ON produits
  FOR UPDATE USING (tenant_id = get_current_restaurant_id())
  WITH CHECK (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_produits_delete" ON produits
  FOR DELETE USING (tenant_id = get_current_restaurant_id());

-- ── categories ───────────────────────────────────────────────
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

DROP POLICY IF EXISTS "tenant_categories_select" ON categories;
DROP POLICY IF EXISTS "tenant_categories_insert" ON categories;
DROP POLICY IF EXISTS "tenant_categories_update" ON categories;
DROP POLICY IF EXISTS "tenant_categories_delete" ON categories;

CREATE POLICY "tenant_categories_select" ON categories
  FOR SELECT USING (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_categories_insert" ON categories
  FOR INSERT WITH CHECK (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_categories_update" ON categories
  FOR UPDATE USING (tenant_id = get_current_restaurant_id())
  WITH CHECK (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_categories_delete" ON categories
  FOR DELETE USING (tenant_id = get_current_restaurant_id());

-- ── prix ──────────────────────────────────────────────────────
ALTER TABLE prix ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

DROP POLICY IF EXISTS "tenant_prix_select" ON prix;
DROP POLICY IF EXISTS "tenant_prix_insert" ON prix;
DROP POLICY IF EXISTS "tenant_prix_update" ON prix;
DROP POLICY IF EXISTS "tenant_prix_delete" ON prix;

CREATE POLICY "tenant_prix_select" ON prix
  FOR SELECT USING (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_prix_insert" ON prix
  FOR INSERT WITH CHECK (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_prix_update" ON prix
  FOR UPDATE USING (tenant_id = get_current_restaurant_id())
  WITH CHECK (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_prix_delete" ON prix
  FOR DELETE USING (tenant_id = get_current_restaurant_id());

-- ── orders ────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

DROP POLICY IF EXISTS "tenant_orders_insert" ON orders;
DROP POLICY IF EXISTS "tenant_orders_select" ON orders;
DROP POLICY IF EXISTS "tenant_orders_update" ON orders;
DROP POLICY IF EXISTS "tenant_orders_delete" ON orders;

CREATE POLICY "tenant_orders_insert" ON orders
  FOR INSERT WITH CHECK (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_orders_select" ON orders
  FOR SELECT USING (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_orders_update" ON orders
  FOR UPDATE USING (tenant_id = get_current_restaurant_id())
  WITH CHECK (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_orders_delete" ON orders
  FOR DELETE USING (tenant_id = get_current_restaurant_id());

-- ── order_items ──────────────────────────────────────────────
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

DROP POLICY IF EXISTS "tenant_order_items_insert" ON order_items;
DROP POLICY IF EXISTS "tenant_order_items_select" ON order_items;
DROP POLICY IF EXISTS "tenant_order_items_update" ON order_items;
DROP POLICY IF EXISTS "tenant_order_items_delete" ON order_items;

CREATE POLICY "tenant_order_items_insert" ON order_items
  FOR INSERT WITH CHECK (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_order_items_select" ON order_items
  FOR SELECT USING (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_order_items_update" ON order_items
  FOR UPDATE USING (tenant_id = get_current_restaurant_id())
  WITH CHECK (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_order_items_delete" ON order_items
  FOR DELETE USING (tenant_id = get_current_restaurant_id());

-- ── ratings ──────────────────────────────────────────────────
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

DROP POLICY IF EXISTS "tenant_ratings_insert" ON ratings;
DROP POLICY IF EXISTS "tenant_ratings_select" ON ratings;
DROP POLICY IF EXISTS "tenant_ratings_delete" ON ratings;

CREATE POLICY "tenant_ratings_insert" ON ratings
  FOR INSERT WITH CHECK (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_ratings_select" ON ratings
  FOR SELECT USING (tenant_id = get_current_restaurant_id());

CREATE POLICY "tenant_ratings_delete" ON ratings
  FOR DELETE USING (tenant_id = get_current_restaurant_id());

-- ── tailles ──────────────────────────────────────────────────
ALTER TABLE tailles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

DROP POLICY IF EXISTS "tenant_tailles_select" ON tailles;

CREATE POLICY "tenant_tailles_select" ON tailles
  FOR SELECT USING (tenant_id = get_current_restaurant_id());

-- ── bases_sauce ──────────────────────────────────────────────
ALTER TABLE bases_sauce ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

DROP POLICY IF EXISTS "tenant_bases_sauce_select" ON bases_sauce;

CREATE POLICY "tenant_bases_sauce_select" ON bases_sauce
  FOR SELECT USING (tenant_id = get_current_restaurant_id());

-- ── Storage: product-images ──────────────────────────────────
DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;

CREATE POLICY "product_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "product_images_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );
