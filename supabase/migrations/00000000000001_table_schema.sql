-- TTAnalysis Main Schema (adapted for Supabase)

-- Users Table - connects to auth.users
-- Note: We omit the id column as it's linked to auth.users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    preferences JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    winning_shot VARCHAR(50) NOT NULL,
    other_shot VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(set_id, point_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON public.matches(user_id);
CREATE INDEX IF NOT EXISTS idx_sets_match_id ON public.sets(match_id);
CREATE INDEX IF NOT EXISTS idx_points_set_id ON public.points(set_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating the updated_at timestamp
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_matches_updated_at ON public.matches;
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sets_updated_at ON public.sets;
CREATE TRIGGER update_sets_updated_at
BEFORE UPDATE ON public.sets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Users can read their own profile
CREATE POLICY "Users can view own profile" 
  ON public.users FOR SELECT 
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.users FOR UPDATE 
  USING (id = auth.uid());

-- Users can view their own matches
CREATE POLICY "Users can view own matches" 
  ON public.matches FOR SELECT 
  USING (user_id = auth.uid());

-- Users can create their own matches
CREATE POLICY "Users can create own matches" 
  ON public.matches FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Users can update their own matches
CREATE POLICY "Users can update own matches" 
  ON public.matches FOR UPDATE 
  USING (user_id = auth.uid());

-- Users can view sets from their matches
CREATE POLICY "Users can view sets from own matches" 
  ON public.sets FOR SELECT 
  USING ((SELECT user_id FROM public.matches WHERE id = match_id) = auth.uid());

-- Users can create sets for their matches
CREATE POLICY "Users can create sets for own matches" 
  ON public.sets FOR INSERT 
  WITH CHECK ((SELECT user_id FROM public.matches WHERE id = match_id) = auth.uid());

-- Users can update sets for their matches
CREATE POLICY "Users can update sets for own matches" 
  ON public.sets FOR UPDATE 
  USING ((SELECT user_id FROM public.matches WHERE id = match_id) = auth.uid());

-- Users can view points from their sets/matches
CREATE POLICY "Users can view points from own sets" 
  ON public.points FOR SELECT 
  USING ((SELECT user_id FROM public.matches WHERE id = (SELECT match_id FROM public.sets WHERE id = set_id)) = auth.uid());

-- Users can create points for their sets/matches
CREATE POLICY "Users can create points for own sets" 
  ON public.points FOR INSERT 
  WITH CHECK ((SELECT user_id FROM public.matches WHERE id = (SELECT match_id FROM public.sets WHERE id = set_id)) = auth.uid());

-- Users can update points for their sets/matches
CREATE POLICY "Users can update points for own sets" 
  ON public.points FOR UPDATE 
  USING ((SELECT user_id FROM public.matches WHERE id = (SELECT match_id FROM public.sets WHERE id = set_id)) = auth.uid());

-- Users can delete points from their sets/matches
CREATE POLICY "Users can delete points from own sets" 
  ON public.points FOR DELETE 
  USING ((SELECT user_id FROM public.matches WHERE id = (SELECT match_id FROM public.sets WHERE id = set_id)) = auth.uid());