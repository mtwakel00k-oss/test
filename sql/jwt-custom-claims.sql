-- ============================================================
-- JWT CUSTOM CLAIMS HOOK (Master DB — Supabase Auth hook)
-- Injects restaurant_id and role from restaurant_users table
-- into JWT claims so RLS policies can enforce tenant isolation.
-- ============================================================
-- Run this SQL in the Master Supabase project SQL Editor.
-- Then go to Auth > Hooks (Customize your JWT claims) and set:
--   Hook URL: pg_functions:///public/custom_jwt_claims
--   HTTP Method: POST
-- ============================================================

-- FIXED: Uses restaurant_users table (FK to tenants, not "restaurants")
CREATE OR REPLACE FUNCTION public.custom_jwt_claims(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_role text;
BEGIN
  SELECT ru.restaurant_id, ru.role
  INTO v_restaurant_id, v_role
  FROM restaurant_users ru
  WHERE ru.user_id = (event->>'user_id')::uuid
  LIMIT 1;

  RETURN event
    || jsonb_build_object('claims',
        jsonb_build_object(
          'restaurant_id', v_restaurant_id,
          'role', v_role
        )
       );
END;
$$;
