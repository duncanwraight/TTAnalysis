-- Initialize the auth schema and related extensions
CREATE SCHEMA IF NOT EXISTS auth;

-- Enable the required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create auth related tables if they don't exist already
-- We're keeping this minimalistic as Supabase Auth will create what it needs

-- Update the users table to work with Supabase Auth
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);

-- Create trigger to sync users between auth.users and public.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'New User'), NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET email = NEW.email,
      name = COALESCE(NEW.raw_user_meta_data->>'name', public.users.name),
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_user_created();

-- Add Row Level Security (RLS) to tables
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

-- Create policies for matches
CREATE POLICY "Users can view their own matches" 
  ON public.matches FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own matches" 
  ON public.matches FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own matches" 
  ON public.matches FOR UPDATE 
  USING (user_id = auth.uid());

-- Create policies for sets (via match ownership)
CREATE POLICY "Users can view their own sets" 
  ON public.sets FOR SELECT 
  USING ((SELECT user_id FROM public.matches WHERE id = match_id) = auth.uid());

CREATE POLICY "Users can insert sets for their matches" 
  ON public.sets FOR INSERT 
  WITH CHECK ((SELECT user_id FROM public.matches WHERE id = match_id) = auth.uid());

CREATE POLICY "Users can update sets for their matches" 
  ON public.sets FOR UPDATE 
  USING ((SELECT user_id FROM public.matches WHERE id = match_id) = auth.uid());

-- Create policies for points (via set and match ownership)
CREATE POLICY "Users can view their own points" 
  ON public.points FOR SELECT 
  USING ((SELECT user_id FROM public.matches WHERE id = (SELECT match_id FROM public.sets WHERE id = set_id)) = auth.uid());

CREATE POLICY "Users can insert points for their sets" 
  ON public.points FOR INSERT 
  WITH CHECK ((SELECT user_id FROM public.matches WHERE id = (SELECT match_id FROM public.sets WHERE id = set_id)) = auth.uid());

CREATE POLICY "Users can delete their own points" 
  ON public.points FOR DELETE 
  USING ((SELECT user_id FROM public.matches WHERE id = (SELECT match_id FROM public.sets WHERE id = set_id)) = auth.uid());