-- ============================================================
--  MIGRATION V2 — Product images, sizes & prices management
-- ============================================================

-- 1) Add missing columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','preparing','ready','on_the_way','completed','cancelled'));

-- 2) Add missing columns to produits
ALTER TABLE produits ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
UPDATE produits SET is_available = TRUE WHERE is_available IS NULL;
ALTER TABLE produits ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3) Storage bucket for product images
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, false, 5242880, '{image/png,image/jpeg,image/webp,image/gif}')
ON CONFLICT (id) DO NOTHING;

-- 4) Storage policies (anon can read, authenticated can upload)
DROP POLICY IF EXISTS "product_images_select" ON storage.objects;
CREATE POLICY "product_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
CREATE POLICY "product_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
CREATE POLICY "product_images_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images');

-- 5) Recreate v_products_flat view to include image_url
DROP VIEW IF EXISTS v_products_flat;
CREATE VIEW v_products_flat AS
WITH prix_agg AS (
  SELECT
    pr.produit_id,
    COALESCE(t.code, 'UNIQUE') AS taille_code,
    MIN(CASE WHEN bs.id = 1 THEN pr.prix END) AS sauce_tomate,
    MIN(CASE WHEN bs.id = 2 THEN pr.prix END) AS creme_fraiche,
    MIN(CASE WHEN bs.id IS NULL THEN pr.prix END) AS standard
  FROM prix pr
  LEFT JOIN tailles t ON t.id = pr.taille_id
  LEFT JOIN bases_sauce bs ON bs.id = pr.base_sauce_id
  WHERE pr.disponible
  GROUP BY pr.produit_id, t.code
)
SELECT
  p.id,
  p.nom AS name,
  p.description,
  p.image_url,
  c.nom AS category,
  p.est_speciale,
  p.is_available,
  EXISTS(SELECT 1 FROM prix pr JOIN bases_sauce bs ON bs.id = pr.base_sauce_id WHERE pr.produit_id = p.id AND bs.id = 2) AS has_white_sauce,
  COALESCE(
    (SELECT jsonb_object_agg(taille_code, jsonb_build_object('sauce_tomate', sauce_tomate, 'creme_fraiche', creme_fraiche, 'standard', standard))
     FROM prix_agg WHERE produit_id = p.id),
    '{}'::jsonb
  ) AS prices
FROM produits p
JOIN categories c ON c.id = p.categorie_id
ORDER BY c.id, p.id;

-- 6) Add description column to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;

-- 7) RLS policies — allow admin to freely manage categories and products
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE prix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_admin_all" ON categories;
CREATE POLICY "categories_admin_all" ON categories
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "categories_public_select" ON categories;
CREATE POLICY "categories_public_select" ON categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "produits_admin_all" ON produits;
CREATE POLICY "produits_admin_all" ON produits
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "produits_public_select" ON produits;
CREATE POLICY "produits_public_select" ON produits
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "prix_admin_all" ON prix;
CREATE POLICY "prix_admin_all" ON prix
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tailles_admin_all" ON tailles;
CREATE POLICY "tailles_admin_all" ON tailles
  FOR ALL USING (true) WITH CHECK (true);

-- 8) RLS — admin delete policies for orders/order_items/ratings (needed by clear-data button)
DROP POLICY IF EXISTS "orders_delete_admin" ON orders;
CREATE POLICY "orders_delete_admin" ON orders
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "order_items_delete_admin" ON order_items;
CREATE POLICY "order_items_delete_admin" ON order_items
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "ratings_delete_admin" ON ratings;
CREATE POLICY "ratings_delete_admin" ON ratings
  FOR DELETE USING (true);

-- 9) Seed tailles if empty
INSERT INTO tailles (code, label)
SELECT * FROM (VALUES ('L', 'Large'), ('XL', 'Extra Large'), ('XXL', 'Double Extra Large'), ('M', 'Medium'), ('S', 'Small'))
AS v(code, label)
WHERE NOT EXISTS (SELECT 1 FROM tailles);

-- 10) Add order_id to ratings table (for order-level rating)
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE;
