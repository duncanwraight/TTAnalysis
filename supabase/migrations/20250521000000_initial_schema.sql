-- TTAnalysis Database Schema
-- Initial schema setup with Auth, Tables, and Relationships

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create auth schema if it doesn't exist (should be created by Supabase)
CREATE SCHEMA IF NOT EXISTS auth;

-- Users Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    preferences JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shot Categories Table
CREATE TABLE IF NOT EXISTS public.shot_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shots Table
CREATE TABLE IF NOT EXISTS public.shots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.shot_categories(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    opponent_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    match_score VARCHAR(50) DEFAULT '0-0',
    notes TEXT,
    initial_server VARCHAR(10) CHECK (initial_server IN ('player', 'opponent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sets Table
CREATE TABLE IF NOT EXISTS public.sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    score VARCHAR(50) NOT NULL DEFAULT '0-0',
    player_score INTEGER NOT NULL DEFAULT 0,
    opponent_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(match_id, set_number)
);

-- Points Table
CREATE TABLE IF NOT EXISTS public.points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID NOT NULL REFERENCES public.sets(id) ON DELETE CASCADE,
    point_number INTEGER NOT NULL,
    winner VARCHAR(10) NOT NULL CHECK (winner IN ('player', 'opponent')),
    winning_shot_id UUID REFERENCES public.shots(id),
    winning_hand VARCHAR(10) CHECK (winning_hand IN ('fh', 'bh')),
    other_shot_id UUID REFERENCES public.shots(id),
    other_hand VARCHAR(10) CHECK (other_hand IN ('fh', 'bh')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(set_id, point_number)
);

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shot_categories_updated_at
BEFORE UPDATE ON public.shot_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shots_updated_at
BEFORE UPDATE ON public.shots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sets_updated_at
BEFORE UPDATE ON public.sets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to sync auth.users with public.users
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_auth_user_created();

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shot_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Shot categories and shots are readable by everyone
CREATE POLICY "Anyone can view shot categories" 
  ON public.shot_categories FOR SELECT 
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can view shots" 
  ON public.shots FOR SELECT 
  TO authenticated, anon
  USING (true);

-- Only database owners can modify shot categories and shots
CREATE POLICY "Only superusers can modify shot categories" 
  ON public.shot_categories FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Only superusers can modify shots" 
  ON public.shots FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- User policies
CREATE POLICY "Users can view own profile" 
  ON public.users FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" 
  ON public.users FOR UPDATE 
  USING (id = auth.uid());

-- Match policies
CREATE POLICY "Users can view own matches" 
  ON public.matches FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own matches" 
  ON public.matches FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own matches" 
  ON public.matches FOR UPDATE 
  USING (user_id = auth.uid());

-- Set policies
CREATE POLICY "Users can view sets from own matches" 
  ON public.sets FOR SELECT 
  USING ((SELECT user_id FROM public.matches WHERE id = match_id) = auth.uid());

CREATE POLICY "Users can create sets for own matches" 
  ON public.sets FOR INSERT 
  WITH CHECK ((SELECT user_id FROM public.matches WHERE id = match_id) = auth.uid());

CREATE POLICY "Users can update sets for own matches" 
  ON public.sets FOR UPDATE 
  USING ((SELECT user_id FROM public.matches WHERE id = match_id) = auth.uid());

-- Point policies
CREATE POLICY "Users can view points from own sets" 
  ON public.points FOR SELECT 
  USING ((SELECT user_id FROM public.matches WHERE id = (SELECT match_id FROM public.sets WHERE id = set_id)) = auth.uid());

CREATE POLICY "Users can create points for own sets" 
  ON public.points FOR INSERT 
  WITH CHECK ((SELECT user_id FROM public.matches WHERE id = (SELECT match_id FROM public.sets WHERE id = set_id)) = auth.uid());

CREATE POLICY "Users can update points for own sets" 
  ON public.points FOR UPDATE 
  USING ((SELECT user_id FROM public.matches WHERE id = (SELECT match_id FROM public.sets WHERE id = set_id)) = auth.uid());

CREATE POLICY "Users can delete points from own sets" 
  ON public.points FOR DELETE 
  USING ((SELECT user_id FROM public.matches WHERE id = (SELECT match_id FROM public.sets WHERE id = set_id)) = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shots_category_id ON public.shots(category_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON public.matches(user_id);
CREATE INDEX IF NOT EXISTS idx_sets_match_id ON public.sets(match_id);
CREATE INDEX IF NOT EXISTS idx_points_set_id ON public.points(set_id);
CREATE INDEX IF NOT EXISTS idx_points_winning_shot_id ON public.points(winning_shot_id);
CREATE INDEX IF NOT EXISTS idx_points_other_shot_id ON public.points(other_shot_id);