-- Add admin policies for shot management
-- This migration adds the necessary RLS policies to allow admins to manage shots and categories

-- Admin function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies for shot_categories
CREATE POLICY "Admins can insert shot categories"
  ON public.shot_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update shot categories"
  ON public.shot_categories FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete shot categories"
  ON public.shot_categories FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Admin policies for shots
CREATE POLICY "Admins can insert shots"
  ON public.shots FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update shots"
  ON public.shots FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete shots"
  ON public.shots FOR DELETE
  TO authenticated
  USING (public.is_admin());