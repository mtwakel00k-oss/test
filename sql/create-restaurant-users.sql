-- 1. إنشاء جدول ربط المستخدمين بالمطاعم
-- SECURITY FIX: Links users to specific restaurants for tenant access control
CREATE TABLE IF NOT EXISTS restaurant_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  role text CHECK (role IN ('admin', 'cashier', 'chef')) NOT NULL,
  UNIQUE(user_id, restaurant_id)
);

ALTER TABLE restaurant_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_see_own_membership" ON restaurant_users;
CREATE POLICY "users_see_own_membership" ON restaurant_users
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admins_see_all" ON restaurant_users;
CREATE POLICY "admins_see_all" ON restaurant_users
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- 2. نقل المستخدمين الموجودين تلقائياً
INSERT INTO restaurant_users (user_id, restaurant_id, role)
SELECT 
  u.id,
  t.id,
  COALESCE((u.raw_user_meta_data->>'role')::text, 'admin')
FROM auth.users u
JOIN tenants t 
  ON t.slug = (u.raw_user_meta_data->>'slug')::text
ON CONFLICT (user_id, restaurant_id) DO NOTHING;
