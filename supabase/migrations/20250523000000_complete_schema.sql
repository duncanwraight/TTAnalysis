-- TTAnalysis Complete Database Schema
-- Single migration with all tables, views, and policies

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Shot Categories Table
CREATE TABLE IF NOT EXISTS public.shot_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shots Table
CREATE TABLE IF NOT EXISTS public.shots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.shot_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opponent_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    match_score VARCHAR(20) NOT NULL DEFAULT '0-0',
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
    score VARCHAR(20) NOT NULL DEFAULT '0-0',
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
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    point_number INTEGER NOT NULL,
    winner VARCHAR(10) NOT NULL CHECK (winner IN ('player', 'opponent')),
    winning_shot_id UUID NOT NULL REFERENCES public.shots(id),
    winning_hand VARCHAR(2) CHECK (winning_hand IN ('fh', 'bh')),
    other_shot_id UUID NOT NULL REFERENCES public.shots(id),
    other_hand VARCHAR(2) CHECK (other_hand IN ('fh', 'bh')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(set_id, point_number)
);

-- Profiles Table (for admin management)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_shot_categories_updated_at BEFORE UPDATE ON public.shot_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shots_updated_at BEFORE UPDATE ON public.shots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sets_updated_at BEFORE UPDATE ON public.sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
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

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.shot_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shot_categories (public read)
CREATE POLICY "Anyone can view shot categories"
  ON public.shot_categories FOR SELECT
  USING (true);

-- RLS Policies for shots (public read)
CREATE POLICY "Anyone can view shots"
  ON public.shots FOR SELECT
  USING (true);

-- RLS Policies for matches
CREATE POLICY "Users can view own matches"
  ON public.matches FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own matches"
  ON public.matches FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own matches"
  ON public.matches FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own matches"
  ON public.matches FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for sets
CREATE POLICY "Users can view sets from own matches"
  ON public.sets FOR SELECT
  USING (match_id IN (
    SELECT id FROM public.matches WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert sets for own matches"
  ON public.sets FOR INSERT
  WITH CHECK (match_id IN (
    SELECT id FROM public.matches WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update sets from own matches"
  ON public.sets FOR UPDATE
  USING (match_id IN (
    SELECT id FROM public.matches WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete sets from own matches"
  ON public.sets FOR DELETE
  USING (match_id IN (
    SELECT id FROM public.matches WHERE user_id = auth.uid()
  ));

-- RLS Policies for points
CREATE POLICY "Users can view points from own matches"
  ON public.points FOR SELECT
  USING (match_id IN (
    SELECT id FROM public.matches WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert points for own matches"
  ON public.points FOR INSERT
  WITH CHECK (match_id IN (
    SELECT id FROM public.matches WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update points from own matches"
  ON public.points FOR UPDATE
  USING (match_id IN (
    SELECT id FROM public.matches WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete points from own matches"
  ON public.points FOR DELETE
  USING (match_id IN (
    SELECT id FROM public.matches WHERE user_id = auth.uid()
  ));

-- RLS Policies for profiles (simple, no recursion)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_shots_category_id ON public.shots(category_id);
CREATE INDEX idx_matches_user_id ON public.matches(user_id);
CREATE INDEX idx_sets_match_id ON public.sets(match_id);
CREATE INDEX idx_points_set_id ON public.points(set_id);
CREATE INDEX idx_points_match_id ON public.points(match_id);
CREATE INDEX idx_points_winning_shot_id ON public.points(winning_shot_id);
CREATE INDEX idx_points_other_shot_id ON public.points(other_shot_id);

-- Analysis Views
CREATE OR REPLACE VIEW match_summary AS
SELECT 
  m.id AS match_id,
  m.opponent_name,
  m.date,
  m.match_score,
  COUNT(p.id) AS total_points,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS points_won,
  SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS points_lost,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / NULLIF(COUNT(p.id), 0), 1) AS points_win_percentage
FROM matches m
LEFT JOIN sets s ON s.match_id = m.id
LEFT JOIN points p ON p.set_id = s.id
GROUP BY m.id, m.opponent_name, m.date, m.match_score;

CREATE OR REPLACE VIEW shot_distribution AS
SELECT 
  m.id AS match_id,
  sh.name,
  COUNT(*) AS total_shots,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS wins,
  SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS losses,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / COUNT(*), 1) AS success_rate,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY m.id), 1) AS percentage_of_total
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots sh ON sh.id = p.winning_shot_id
GROUP BY m.id, sh.name;

CREATE OR REPLACE VIEW most_effective_shots AS
SELECT 
  match_id,
  name,
  total_shots,
  wins,
  losses,
  success_rate,
  percentage_of_total
FROM shot_distribution
WHERE wins >= 3
ORDER BY success_rate DESC;

CREATE OR REPLACE VIEW most_costly_shots AS
SELECT 
  match_id,
  name,
  total_shots,
  wins,
  losses,
  success_rate,
  percentage_of_total
FROM shot_distribution
WHERE losses >= 3
ORDER BY success_rate ASC;

CREATE OR REPLACE VIEW hand_analysis AS
SELECT 
  m.id AS match_id,
  p.winning_hand AS hand,
  COUNT(*) AS total_shots,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS wins,
  SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS losses,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / COUNT(*), 1) AS success_rate
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
WHERE p.winning_hand IS NOT NULL
GROUP BY m.id, p.winning_hand;

CREATE OR REPLACE VIEW set_breakdown AS
SELECT 
  m.id AS match_id,
  s.set_number,
  sh.name AS shot_name,
  COUNT(*) AS total_shots_in_set,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS wins_in_set
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots sh ON sh.id = p.winning_shot_id
GROUP BY m.id, s.set_number, sh.name;

CREATE OR REPLACE VIEW tactical_insights AS
SELECT 
  m.id AS match_id,
  w_sh.name AS winning_shot,
  o_sh.name AS opponent_shot,
  COUNT(*) AS total_encounters,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS wins,
  SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS losses,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_percentage
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots w_sh ON w_sh.id = p.winning_shot_id
JOIN shots o_sh ON o_sh.id = p.other_shot_id
GROUP BY m.id, w_sh.name, o_sh.name
HAVING COUNT(*) >= 3
ORDER BY win_percentage DESC;

-- Insert shot categories
INSERT INTO public.shot_categories (name, display_order) VALUES
('serve', 1),
('return', 2),
('drive', 3),
('push', 4),
('flick', 5),
('loop', 6),
('smash', 7),
('drop', 8),
('lob', 9),
('block', 10),
('chop', 11),
('counter', 12)
ON CONFLICT (name) DO NOTHING;

-- Insert shots
INSERT INTO public.shots (category_id, name, display_name, description, display_order) VALUES
-- Serve shots
((SELECT id FROM public.shot_categories WHERE name = 'serve'), 'short_serve', 'Short Serve', 'Short serve to the net', 1),
((SELECT id FROM public.shot_categories WHERE name = 'serve'), 'long_serve', 'Long Serve', 'Long serve to the baseline', 2),
((SELECT id FROM public.shot_categories WHERE name = 'serve'), 'sidespin_serve', 'Sidespin Serve', 'Serve with sidespin', 3),
((SELECT id FROM public.shot_categories WHERE name = 'serve'), 'topspin_serve', 'Topspin Serve', 'Serve with topspin', 4),
((SELECT id FROM public.shot_categories WHERE name = 'serve'), 'backspin_serve', 'Backspin Serve', 'Serve with backspin', 5),

-- Return shots
((SELECT id FROM public.shot_categories WHERE name = 'return'), 'push_return', 'Push Return', 'Push return of serve', 1),
((SELECT id FROM public.shot_categories WHERE name = 'return'), 'flick_return', 'Flick Return', 'Aggressive flick return', 2),
((SELECT id FROM public.shot_categories WHERE name = 'return'), 'loop_return', 'Loop Return', 'Topspin loop return', 3),
((SELECT id FROM public.shot_categories WHERE name = 'return'), 'drop_return', 'Drop Return', 'Short drop return', 4),

-- Drive shots
((SELECT id FROM public.shot_categories WHERE name = 'drive'), 'forehand_drive', 'Forehand Drive', 'Flat forehand drive', 1),
((SELECT id FROM public.shot_categories WHERE name = 'drive'), 'backhand_drive', 'Backhand Drive', 'Flat backhand drive', 2),

-- Push shots
((SELECT id FROM public.shot_categories WHERE name = 'push'), 'forehand_push', 'Forehand Push', 'Backspin forehand push', 1),
((SELECT id FROM public.shot_categories WHERE name = 'push'), 'backhand_push', 'Backhand Push', 'Backspin backhand push', 2),

-- Flick shots
((SELECT id FROM public.shot_categories WHERE name = 'flick'), 'forehand_flick', 'Forehand Flick', 'Quick forehand flick', 1),
((SELECT id FROM public.shot_categories WHERE name = 'flick'), 'backhand_flick', 'Backhand Flick', 'Quick backhand flick', 2),

-- Loop shots
((SELECT id FROM public.shot_categories WHERE name = 'loop'), 'forehand_loop', 'Forehand Loop', 'Topspin forehand loop', 1),
((SELECT id FROM public.shot_categories WHERE name = 'loop'), 'backhand_loop', 'Backhand Loop', 'Topspin backhand loop', 2),
((SELECT id FROM public.shot_categories WHERE name = 'loop'), 'loop_kill', 'Loop Kill', 'Aggressive topspin finish', 3),

-- Smash shots
((SELECT id FROM public.shot_categories WHERE name = 'smash'), 'forehand_smash', 'Forehand Smash', 'Overhead forehand smash', 1),
((SELECT id FROM public.shot_categories WHERE name = 'smash'), 'backhand_smash', 'Backhand Smash', 'Overhead backhand smash', 2),

-- Drop shots
((SELECT id FROM public.shot_categories WHERE name = 'drop'), 'drop_shot', 'Drop Shot', 'Short drop shot', 1),

-- Lob shots
((SELECT id FROM public.shot_categories WHERE name = 'lob'), 'defensive_lob', 'Defensive Lob', 'High defensive lob', 1),
((SELECT id FROM public.shot_categories WHERE name = 'lob'), 'attacking_lob', 'Attacking Lob', 'Lower attacking lob', 2),

-- Block shots
((SELECT id FROM public.shot_categories WHERE name = 'block'), 'forehand_block', 'Forehand Block', 'Passive forehand block', 1),
((SELECT id FROM public.shot_categories WHERE name = 'block'), 'backhand_block', 'Backhand Block', 'Passive backhand block', 2),
((SELECT id FROM public.shot_categories WHERE name = 'block'), 'active_block', 'Active Block', 'Aggressive block with angle', 3),

-- Chop shots
((SELECT id FROM public.shot_categories WHERE name = 'chop'), 'forehand_chop', 'Forehand Chop', 'Heavy backspin chop', 1),
((SELECT id FROM public.shot_categories WHERE name = 'chop'), 'backhand_chop', 'Backhand Chop', 'Heavy backspin chop', 2),

-- Counter shots
((SELECT id FROM public.shot_categories WHERE name = 'counter'), 'counter_drive', 'Counter Drive', 'Fast counter drive', 1),
((SELECT id FROM public.shot_categories WHERE name = 'counter'), 'counter_loop', 'Counter Loop', 'Topspin counter loop', 2)

ON CONFLICT (category_id, name) DO NOTHING;