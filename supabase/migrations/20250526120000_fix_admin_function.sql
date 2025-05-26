-- Fix admin function to work properly with RLS
-- The original function may have issues with the security context

-- Replace the existing function without dropping it first
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_admin BOOLEAN := false;
BEGIN
  -- Get the current user ID
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is admin
  SELECT is_admin INTO user_admin
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- Return false if no profile found or is_admin is null
  RETURN COALESCE(user_admin, false);
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, return false for security
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to use the function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;