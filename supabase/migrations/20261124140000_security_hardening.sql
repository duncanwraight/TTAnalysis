-- Security hardening from the 2026-11-24 audit.
--
-- 1. Profiles: the update policy let users change any column of their own row,
--    including is_admin, so anyone could make themselves admin. Only admins can
--    now change is_admin, and nothing else on a profile is writable through the
--    API. Admins can read every profile, which the admin panel needs.
-- 2. Points: the insert check only looked at match_id, so a point could name a
--    set from another user's match. The set must now belong to the point's match.
-- 3. Function grants: handle_new_user is a trigger function and is_admin is only
--    useful to signed-in users, so neither is executable by anon.
-- 4. TRUNCATE ignores RLS, so anon and authenticated lose it on every table.

-- 1. Profiles

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile, admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can change admin status" ON public.profiles;

CREATE POLICY "Users can view own profile, admins can view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can change admin status"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Profile rows are created by the handle_new_user trigger and removed with the
-- auth user, so the API never needs to insert or delete them
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (is_admin) ON public.profiles TO authenticated;

-- 2. Points must sit in a set of the same match

DROP POLICY IF EXISTS "Users can insert points for own matches" ON public.points;
DROP POLICY IF EXISTS "Users can update points from own matches" ON public.points;

CREATE POLICY "Users can insert points for own matches"
  ON public.points FOR INSERT
  WITH CHECK (
    match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.sets s WHERE s.id = set_id AND s.match_id = points.match_id)
  );

CREATE POLICY "Users can update points from own matches"
  ON public.points FOR UPDATE
  USING (match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid()))
  WITH CHECK (
    match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.sets s WHERE s.id = set_id AND s.match_id = points.match_id)
  );

-- 3. Function grants

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 4. TRUNCATE

REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE ON TABLES FROM anon, authenticated;
