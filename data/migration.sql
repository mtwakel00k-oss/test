-- ============================================================
--  BURGER HOUSE - base de donnees complete (fournie par le proprietaire)
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    nom         VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS tailles (
    id     SERIAL PRIMARY KEY,
    code   VARCHAR(10) NOT NULL UNIQUE,
    label  VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS bases_sauce (
    id    SERIAL PRIMARY KEY,
    label VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS produits (
    id           SERIAL PRIMARY KEY,
    categorie_id INT REFERENCES categories(id),
    nom          VARCHAR(150) NOT NULL,
    description  TEXT,
    est_speciale BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS prix (
    id             SERIAL PRIMARY KEY,
    produit_id     INT REFERENCES produits(id),
    taille_id      INT REFERENCES tailles(id),
    base_sauce_id  INT REFERENCES bases_sauce(id),
    prix           NUMERIC(8,2) NOT NULL,
    disponible     BOOLEAN DEFAULT TRUE
);

-- Tailles (idempotent)
INSERT INTO tailles (code, label) VALUES
    ('L',   'Large'),
    ('XL',  'Extra Large'),
    ('XXL', 'Double Extra Large')
ON CONFLICT (code) DO NOTHING;

-- Sauces (idempotent)
INSERT INTO bases_sauce (label) VALUES
    ('Sauce Tomate'),
    ('Crème Fraîche')
ON CONFLICT (label) DO NOTHING;

-- Categories (idempotent: seed only if table is empty)
INSERT INTO categories (nom, description)
SELECT * FROM (VALUES
    ('Pizza',              'Pizzas classiques'),
    ('Pizza Spéciale',     'Pizzas spéciales et saisonnières'),
    ('Pizza Walid',        'Pizza maison signature'),
    ('Calzone',            'Calzones fourrées'),
    ('Gratin',             'Gratins chauds'),
    ('Sandwich',           'Sandwichs classiques'),
    ('Sandwich Volcano',   'Sandwich spécial Volcano'),
    ('Tabouna',            'Tabouna traditionnelle'),
    ('Petta',              'Petta maison'),
    ('Tacos Pressé',       'Tacos pressés L/XL'),
    ('Tacos Gratiné',      'Tacos gratinés L/XL'),
    ('Tacos Krouma',       'Tacos géant Krouma'),
    ('Supplement',         'Suppléments et extras'),
    ('Boissons',           'Boissons froides et chaudes')
) AS v(nom, description)
WHERE NOT EXISTS (SELECT 1 FROM categories);

-- Seed menu data (idempotent: skip if produits already populated)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM produits) THEN

-- ============================================================
-- PIZZA CLASSIQUE
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (1, 'Marguerita', 'Sauce Tomate, Fromage cheddar, Olive');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (1, 1, 1, 350), (1, 2, 1, 650), (1, 3, 1, 900);

INSERT INTO produits (categorie_id, nom, description) VALUES
    (1, 'Poulet Haché', 'Sauce Tomate, Poulet, Cheddar, Olive');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (2, 1, 1, 450), (2, 2, 1, 900),  (2, 3, 1, 1200),
    (2, 1, 2, 600), (2, 2, 2, 1000), (2, 3, 2, 1300);

INSERT INTO produits (categorie_id, nom, description) VALUES
    (1, 'Poulet Mariné', 'Sauce Tomate, Poulet Mariné, Cheddar, Olive');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (3, 1, 1, 550), (3, 2, 1, 1100), (3, 3, 1, 1500),
    (3, 1, 2, 650), (3, 2, 2, 1200), (3, 3, 2, 1600);

INSERT INTO produits (categorie_id, nom, description) VALUES
    (1, 'Viande Haché', 'Sauce Tomate, Viande Hachée, Cheddar, Olive');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (4, 1, 1, 550), (4, 2, 1, 950),  (4, 3, 1, 1400),
    (4, 1, 2, 600), (4, 2, 2, 1100), (4, 3, 2, 1500);

INSERT INTO produits (categorie_id, nom, description) VALUES
    (1, 'Dinde Fumé', 'Sauce Tomate, Dinde Fumé, Cheddar, Olive');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (5, 1, 1, 550), (5, 2, 1, 1100), (5, 3, 1, 1400),
    (5, 1, 2, 600), (5, 2, 2, 1200), (5, 3, 2, 1500);

INSERT INTO produits (categorie_id, nom, description) VALUES
    (1, 'Thon', 'Sauce Tomate, Thon, Cheddar, Olive');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (6, 1, 1, 700), (6, 2, 1, 1200), (6, 3, 1, 1500),
    (6, 1, 2, 750), (6, 2, 2, 1300), (6, 3, 2, 1600);

INSERT INTO produits (categorie_id, nom, description) VALUES
    (1, '3 Fromage', 'Sauce Tomate, Fromage Blanc, Cheddar, Camembert, Olive');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (7, 1, 1, 700), (7, 2, 1, 1200), (7, 3, 1, 1500),
    (7, 1, 2, 750), (7, 2, 2, 1300), (7, 3, 2, 1600);

INSERT INTO produits (categorie_id, nom, description) VALUES
    (1, 'Mixte (Poulet/Viande)', 'Sauce Tomate, Poulet, Viande, Cheddar, Olive');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (8, 1, 1, 600), (8, 2, 1, 1100), (8, 3, 1, 1600),
    (8, 1, 2, 700), (8, 2, 2, 1200), (8, 3, 2, 1700);

-- ============================================================
-- PIZZA SPECIALE
-- ============================================================

INSERT INTO produits (categorie_id, nom, description, est_speciale) VALUES
    (2, '3 Saison', 'Sauce Tomate, 2 Viandes, 3 Fromages, Cheddar, Olive', TRUE);
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (9, 2, 1, 1250), (9, 3, 1, 1700),
    (9, 2, 2, 1400), (9, 3, 2, 1900);

INSERT INTO produits (categorie_id, nom, description, est_speciale) VALUES
    (2, '4 Saison', 'Sauce Tomate, 3 Viandes, 3 Fromages, Cheddar, Olive', TRUE);
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (10, 2, 1, 1350), (10, 3, 1, 1800),
    (10, 2, 2, 1500), (10, 3, 2, 2000);

INSERT INTO produits (categorie_id, nom, description, est_speciale) VALUES
    (2, 'Royal', 'Sauce Tomate, 4 Viandes, 3 Fromages, Cheddar, Olive', TRUE);
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (11, 1, 1, 900),  (11, 2, 1, 1800), (11, 3, 1, 2450),
    (11, 1, 2, 1000), (11, 2, 2, 1900), (11, 3, 2, 2650);

INSERT INTO produits (categorie_id, nom, description, est_speciale) VALUES
    (2, 'Pizza Seefar Poulet',  'Sauce Tomate, Poulet, Cheddar, Camembert', TRUE),
    (2, 'Pizza Seefar Viande',  'Sauce Tomate, Viande, Cheddar, Camembert', TRUE),
    (2, 'Pizza Seefar Mixte',   'Sauce Tomate, Poulet, Viande, Cheddar, Camembert', TRUE);
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (12, 1, 1, 1200), (12, 2, 1, 2400),
    (13, 1, 1, 1400), (13, 2, 1, 2700),
    (14, 1, 1, 1400), (14, 2, 1, 2700);

INSERT INTO produits (categorie_id, nom, description, est_speciale) VALUES
    (2, 'Pizza Mexicaine Poulet', 'Sauce Tomate, Poulet, Cheddar, Camembert', TRUE),
    (2, 'Pizza Mexicaine Viande', 'Sauce Tomate, Viande, Cheddar, Camembert', TRUE),
    (2, 'Pizza Mexicaine Mixte',  'Sauce Tomate, Poulet, Viande, Cheddar, Camembert', TRUE);
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (15, 1, 1, 850),  (15, 2, 1, 1500),
    (16, 1, 1, 900),  (16, 2, 1, 1700),
    (17, 1, 1, 1500), (17, 2, 1, 3000);

-- ============================================================
-- PIZZA WALID
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (3, 'Pizza Walid Poulet',          'Sauce Tomate, Poulet'),
    (3, 'Pizza Walid Viande',          'Sauce Tomate, Viande'),
    (3, 'Pizza Walid Thon',            'Sauce Tomate, Thon'),
    (3, 'Pizza Walid Mixte (P/V)',     'Sauce Tomate, Poulet, Viande'),
    (3, 'Pizza Walid Royal',           'Sauce Tomate, Royal');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (18, 1, 1, 850),  (18, 2, 1, 1350), (18, 3, 1, 1750),
    (19, 1, 1, 900),  (19, 2, 1, 1450), (19, 3, 1, 1850),
    (20, 1, 1, 1000), (20, 2, 1, 1550), (20, 3, 1, 2000),
    (21, 1, 1, 1000), (21, 2, 1, 1600), (21, 3, 1, 2000),
    (22, 3, 1, 2600);

-- ============================================================
-- CALZONE
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (4, 'Calzone Poulet',          'Farci Poulet'),
    (4, 'Calzone Viande',          'Farci Viande'),
    (4, 'Calzone Mixte (P/V)',     'Farci Poulet et Viande'),
    (4, 'Calzone Spéciale',        'Farci Spéciale');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (23, NULL, NULL, 600), (24, NULL, NULL, 700),
    (25, NULL, NULL, 700), (26, NULL, NULL, 900);

INSERT INTO produits (categorie_id, nom, description) VALUES
    (4, 'Assiette De Fromage Fondu', 'Fromage fondu en supplément');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES (27, NULL, NULL, 400);

-- ============================================================
-- GRATIN
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (5, 'Gratin Poulet',      'Gratin au Poulet'),
    (5, 'Gratin Viande',      'Gratin à la Viande'),
    (5, 'Gratin Mixte (P/V)', 'Gratin Poulet et Viande'),
    (5, 'Gratin Spéciale',    'Gratin Spéciale');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (28, NULL, NULL, 600), (29, NULL, NULL, 700),
    (30, NULL, NULL, 750), (31, NULL, NULL, 900);

-- ============================================================
-- SANDWICH
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (6, 'Sandwich Poulet Mariné',  'Poulet Mariné'),
    (6, 'Sandwich Viande',         'Viande'),
    (6, 'Sandwich Mixte (P/V)',    'Poulet et Viande'),
    (6, 'Sandwich Spéciale',       'Poulet, Viande, Dinde Fumé, Camembert');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (32, NULL, NULL, 450), (33, NULL, NULL, 550),
    (34, NULL, NULL, 650), (35, NULL, NULL, 750);

-- ============================================================
-- SANDWICH VOLCANO
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (7, 'Volcano Poulet',      'Poulet'),
    (7, 'Volcano Viande',      'Viande'),
    (7, 'Volcano Mixte (P/V)', 'Poulet et Viande'),
    (7, 'Volcano Spéciale',    'Poulet, Viande, Dinde Fumé, Camembert');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (36, NULL, NULL, 750), (37, NULL, NULL, 800),
    (38, NULL, NULL, 850), (39, NULL, NULL, 1000);

-- ============================================================
-- TABOUNA
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (8, 'Tabouna Poulet Mariné', 'Poulet Mariné'),
    (8, 'Tabouna Viande',        'Viande'),
    (8, 'Tabouna Mixte (P/V)',   'Poulet et Viande'),
    (8, 'Tabouna Spéciale',      'Poulet, Viande, Dinde Fumé, Camembert'),
    (8, 'Tabouna Seefar',        'Seefar complet');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (40, NULL, NULL, 550), (41, NULL, NULL, 600),
    (42, NULL, NULL, 650), (43, NULL, NULL, 750), (44, NULL, NULL, 1200);

-- ============================================================
-- PETTA
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (9, 'Petta Poulet Mariné', 'Poulet Mariné'),
    (9, 'Petta Viande',        'Viande'),
    (9, 'Petta Mixte (P/V)',   'Poulet et Viande'),
    (9, 'Petta Spéciale',      'Poulet, Viande, Dinde Fumé, Camembert'),
    (9, 'Petta Seefar',        'Seefar complet');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (45, NULL, NULL, 550), (46, NULL, NULL, 650),
    (47, NULL, NULL, 700), (48, NULL, NULL, 800), (49, NULL, NULL, 1200);

-- ============================================================
-- TACOS PRESSE
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (10, 'Tacos Pressé Poulet',      'Poulet'),
    (10, 'Tacos Pressé Viande',      'Viande'),
    (10, 'Tacos Pressé Mixte (P/V)', 'Poulet et Viande'),
    (10, 'Tacos Pressé Spéciale',    'Spéciale');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (50, 1, NULL, 450), (50, 2, NULL, 900),
    (51, 1, NULL, 500), (51, 2, NULL, 1000),
    (52, 1, NULL, 550), (52, 2, NULL, 1100),
    (53, 1, NULL, 700), (53, 2, NULL, 1400);

-- ============================================================
-- TACOS GRATINE
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (11, 'Tacos Gratiné Poulet',      'Poulet gratiné'),
    (11, 'Tacos Gratiné Viande',      'Viande gratinée'),
    (11, 'Tacos Gratiné Mixte (P/V)', 'Poulet et Viande gratiné'),
    (11, 'Tacos Gratiné Spéciale',    'Spéciale gratiné');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (54, 1, NULL, 550), (54, 2, NULL, 1100),
    (55, 1, NULL, 600), (55, 2, NULL, 1200),
    (56, 1, NULL, 650), (56, 2, NULL, 1300),
    (57, 1, NULL, 800), (57, 2, NULL, 1600);

-- ============================================================
-- TACOS KROUMA
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (12, 'Tacos Krouma',          'Tacos géant'),
    (12, 'Tacos Krouma Spéciale', 'Tacos géant Spéciale');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (58, NULL, NULL, 2000), (59, NULL, NULL, 3000);

-- ============================================================
-- SUPPLEMENTS
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (13, 'Cheddar',               'Supplément fromage Cheddar'),
    (13, 'Camembert',             'Supplément Camembert'),
    (13, 'Fumé',                  'Supplément Fumé'),
    (13, 'Barquette Frite',       'Portion de frites'),
    (13, 'Frite Gratiné',         'Frites gratinées'),
    (13, 'Frite + Sauce Fromage', 'Frites avec sauce fromage');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (60, NULL, NULL, 200), (61, NULL, NULL, 200), (62, NULL, NULL, 200),
    (63, NULL, NULL, 200), (64, NULL, NULL, 300), (65, NULL, NULL, 300);

-- ============================================================
-- BOISSONS
-- ============================================================

INSERT INTO produits (categorie_id, nom, description) VALUES
    (14, 'Gazeuse 1 L',    'Boisson gazeuse 1 litre'),
    (14, 'Jus 1 L',        'Jus de fruits 1 litre'),
    (14, 'Ganette',        'Canette boisson'),
    (14, 'Gazeuse 0.33 L', 'Boisson gazeuse petite bouteille'),
    (14, 'Jus 0.33 L',     'Jus de fruits petit format'),
    (14, 'L''eau 1.5 L',   'Eau minérale 1.5 litre'),
    (14, 'L''eau 0.5 L',   'Eau minérale 0.5 litre');
INSERT INTO prix (produit_id, taille_id, base_sauce_id, prix) VALUES
    (66, NULL, NULL, 150), (67, NULL, NULL, 150), (68, NULL, NULL, 100),
    (69, NULL, NULL, 70),  (70, NULL, NULL, 70),
    (71, NULL, NULL, 50),  (72, NULL, NULL, 30);

  END IF;
END $$;

-- ============================================================
-- VUE: menu plat pour l'app
-- ============================================================

CREATE OR REPLACE VIEW v_menu AS
SELECT
  p.id::TEXT || '-' || COALESCE(t.id::TEXT, '0') || '-' || COALESCE(bs.id::TEXT, '0') AS uid,
  p.id AS product_id,
  p.nom AS name,
  p.description,
  c.nom AS category,
  COALESCE(t.code, 'UNIQUE') AS size,
  t.id AS size_id,
  bs.id AS sauce_id,
  COALESCE(bs.label, '-') AS sauce_label,
  pr.prix AS price,
  CASE WHEN bs.id = 2 THEN TRUE ELSE FALSE END AS has_white_sauce,
  p.est_speciale
FROM prix pr
JOIN produits  p  ON p.id = pr.produit_id
JOIN categories c ON c.id = p.categorie_id
LEFT JOIN tailles     t  ON t.id = pr.taille_id
LEFT JOIN bases_sauce bs ON bs.id = pr.base_sauce_id
ORDER BY c.id, p.id, pr.base_sauce_id NULLS FIRST, pr.taille_id;

-- Vue simplifiee: un produit avec ses prix pour chaque taille+sauce
CREATE OR REPLACE VIEW v_products_flat AS
SELECT
  p.id,
  p.nom AS name,
  p.description,
  c.nom AS category,
  p.est_speciale,
  -- True si au moins un prix existe avec creme fraiche
  BOOL_OR(CASE WHEN bs.id = 2 THEN TRUE ELSE FALSE END) AS has_white_sauce,
  -- Aggreger les prix par taille
  jsonb_object_agg(
    COALESCE(t.code, 'UNIQUE'),
    jsonb_build_object(
      'sauce_tomate',  MIN(CASE WHEN bs.id = 1 THEN pr.prix END),
      'creme_fraiche', MIN(CASE WHEN bs.id = 2 THEN pr.prix END),
      'standard',      MIN(CASE WHEN bs.id IS NULL THEN pr.prix END)
    )
  ) FILTER (WHERE pr.disponible) AS prices
FROM produits p
JOIN categories c ON c.id = p.categorie_id
LEFT JOIN prix pr ON pr.produit_id = p.id
LEFT JOIN tailles t ON t.id = pr.taille_id
LEFT JOIN bases_sauce bs ON bs.id = pr.base_sauce_id
GROUP BY p.id, p.nom, p.description, c.nom, p.est_speciale
ORDER BY c.id, p.id;

-- RLS (idempotent: drop existing policies first)
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE prix ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bases_sauce ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_produits" ON produits;
DROP POLICY IF EXISTS "public_select_prix" ON prix;
DROP POLICY IF EXISTS "public_select_categories" ON categories;
DROP POLICY IF EXISTS "public_select_tailles" ON tailles;
DROP POLICY IF EXISTS "public_select_bases_sauce" ON bases_sauce;

CREATE POLICY "public_select_produits" ON produits FOR SELECT USING (true);
CREATE POLICY "public_select_prix" ON prix FOR SELECT USING (true);
CREATE POLICY "public_select_categories" ON categories FOR SELECT USING (true);
CREATE POLICY "public_select_tailles" ON tailles FOR SELECT USING (true);
CREATE POLICY "public_select_bases_sauce" ON bases_sauce FOR SELECT USING (true);

-- Orders + Order_items + Ratings (avec RLS)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'ready', 'on_the_way', 'cancelled')),
  total NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_select" ON orders FOR SELECT USING (true);
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (true);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES produits(id),
  product_name TEXT NOT NULL,
  size TEXT,
  sauce TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES produits(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ratings_insert" ON ratings;
DROP POLICY IF EXISTS "ratings_select" ON ratings;
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "ratings_select" ON ratings FOR SELECT USING (true);

-- Realtime pour live tracking
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ============================================================
-- Availability toggle for products
-- ============================================================
ALTER TABLE produits ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
UPDATE produits SET is_available = TRUE WHERE is_available IS NULL;

DROP VIEW IF EXISTS v_products_flat;
CREATE OR REPLACE VIEW v_products_flat AS
SELECT
  p.id,
  p.nom AS name,
  p.description,
  c.nom AS category,
  p.est_speciale,
  p.is_available,
  BOOL_OR(CASE WHEN bs.id = 2 THEN TRUE ELSE FALSE END) AS has_white_sauce,
  jsonb_object_agg(
    COALESCE(t.code, 'UNIQUE'),
    jsonb_build_object(
      'sauce_tomate',  MIN(CASE WHEN bs.id = 1 THEN pr.prix END),
      'creme_fraiche', MIN(CASE WHEN bs.id = 2 THEN pr.prix END),
      'standard',      MIN(CASE WHEN bs.id IS NULL THEN pr.prix END)
    )
  ) FILTER (WHERE pr.disponible) AS prices
FROM produits p
JOIN categories c ON c.id = p.categorie_id
LEFT JOIN prix pr ON pr.produit_id = p.id
LEFT JOIN tailles t ON t.id = pr.taille_id
LEFT JOIN bases_sauce bs ON bs.id = pr.base_sauce_id
GROUP BY p.id, p.nom, p.description, c.nom, p.est_speciale, p.is_available
ORDER BY c.id, p.id;

-- ============================================================
-- Order type (dine-in / takeaway)
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'dine_in'
  CHECK (order_type IN ('dine_in', 'takeaway'));

-- ============================================================
-- Profiles (Supabase Auth users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier', 'chef')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
