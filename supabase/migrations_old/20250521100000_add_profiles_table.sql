-- Create profiles table for additional user data including admin status
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add trigger for updated_at column
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync auth.users with profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_admin, created_at, updated_at)
  VALUES (NEW.id, NEW.email, false, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET email = NEW.email,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable Row Level Security on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Admin policies
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- Create first admin user function (can only be run by service role)
CREATE OR REPLACE FUNCTION public.create_admin_user(admin_email TEXT, admin_password TEXT)
RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Create user in auth schema (this would normally be handled by Supabase Auth)
  -- This is simplified for demonstration - in a real implementation,
  -- you'd use Supabase admin APIs to create the user
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
  VALUES (
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin User"}'
  )
  RETURNING id INTO user_id;
  
  -- Set admin status to true
  UPDATE public.profiles
  SET is_admin = true
  WHERE id = user_id;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute privilege on function
GRANT EXECUTE ON FUNCTION public.create_admin_user TO service_role;