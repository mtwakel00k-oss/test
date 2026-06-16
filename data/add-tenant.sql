-- ============================================================
--  إضافة مطعم جديد مع المستخدمين
--  ============================================================
--  شغل هذا في Supabase Dashboard (Master DB) — الـ project الرئيسي
--  (https://supabase.com/dashboard/project/icefntwfwvtonkdyshde)
--
--  بعد تشغيل SQL، نفّذ API setup:
--    POST /api/auth/setup
--    { "slug": "اسم-المطعم" }
--
--  أو استخدم cURL:
--    curl -X POST http://localhost:3000/api/auth/setup ^
--      -H "Content-Type: application/json" ^
--      -d "{\"slug\":\"اسم-المطعم\"}"
-- ============================================================

-- 1) Insert the new restaurant
INSERT INTO tenants (id, slug, name, supabase_url, supabase_anon_key, is_active)
VALUES (
  gen_random_uuid(),
  'اسم-المطعم',         -- ← غيّر هذا (slug)
  'الاسم التجاري',       -- ← غيّر هذا (name)
  'https://xxx.supabase.co',   -- ← غيّر هذا (رابط Supabase حق المطعم)
  'eyJhbGciOi...',             -- ← غيّر هذا (anon key حق المطعم)
  true
)
ON CONFLICT (slug) DO NOTHING;

-- 2) تحقق إنه تمت الإضافة
SELECT id, slug, name, is_active, created_at FROM tenants WHERE slug = 'اسم-المطعم';

-- ============================================================
--  بديل: إنشاء المستخدمين يدويًا (بدون API)
--  ============================================================
--  إذا ما تقدر تستخدم API setup، سوِ التالي:
--
--  أ) روح لـ Supabase Dashboard → Authentication → Users
--  ب) اضغط "Add User" وأنشئ 3 مستخدمين:
--       admin@اسم-المطعم.app    |  Admin123
--       cashier@اسم-المطعم.app   |  Cashier123
--       chef@اسم-المطعم.app      |  Chef1234
--     (خلي Auto Confirm User مفعل)
--
--  ج) خذ الـ UUID حق كل مستخدم من Dashboard، وركّع هذا:
--     (أو استخدم: SELECT id, email FROM auth.users;)

-- INSERT INTO restaurant_users (user_id, restaurant_id, role) VALUES
--   ('UUID-المدير',    (SELECT id FROM tenants WHERE slug = 'اسم-المطعم'), 'admin'),
--   ('UUID-الكاشير',   (SELECT id FROM tenants WHERE slug = 'اسم-المطعم'), 'cashier'),
--   ('UUID-الشيف',     (SELECT id FROM tenants WHERE slug = 'اسم-المطعم'), 'chef')
-- ON CONFLICT (user_id, restaurant_id) DO NOTHING;

-- 3) تحقق من الربط
-- SELECT * FROM restaurant_users
-- WHERE restaurant_id = (SELECT id FROM tenants WHERE slug = 'اسم-المطعم');
