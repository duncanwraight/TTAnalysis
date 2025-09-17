-- Fix Supabase Security Advisories
-- This migration addresses SECURITY DEFINER views and function search_path issues

-- Fix functions with mutable search_path by adding explicit search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Fix SECURITY DEFINER views by converting to SECURITY INVOKER
-- This ensures views respect RLS policies of the querying user

-- Drop existing views first to avoid structure conflicts
DROP VIEW IF EXISTS match_summary CASCADE;
DROP VIEW IF EXISTS shot_distribution CASCADE;
DROP VIEW IF EXISTS most_effective_shots CASCADE;
DROP VIEW IF EXISTS most_costly_shots CASCADE;
DROP VIEW IF EXISTS hand_analysis CASCADE;
DROP VIEW IF EXISTS set_breakdown CASCADE;
DROP VIEW IF EXISTS category_breakdown CASCADE;
DROP VIEW IF EXISTS tactical_insights CASCADE;
DROP VIEW IF EXISTS shot_hand_analysis CASCADE;
DROP VIEW IF EXISTS player_shot_breakdown CASCADE;
DROP VIEW IF EXISTS player_shot_distribution CASCADE;

CREATE VIEW match_summary 
WITH (security_invoker=on) AS
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

CREATE VIEW shot_distribution 
WITH (security_invoker=on) AS
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

CREATE VIEW most_effective_shots 
WITH (security_invoker=on) AS
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

CREATE VIEW most_costly_shots 
WITH (security_invoker=on) AS
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

CREATE VIEW hand_analysis 
WITH (security_invoker=on) AS
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

CREATE VIEW set_breakdown 
WITH (security_invoker=on) AS
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

CREATE VIEW category_breakdown 
WITH (security_invoker=on) AS
SELECT 
  m.id AS match_id,
  sc.name AS category,
  COUNT(*) AS total_shots,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS wins,
  SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS losses,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / COUNT(*), 1) AS success_rate
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots sh ON sh.id = p.winning_shot_id
JOIN shot_categories sc ON sc.id = sh.category_id
GROUP BY m.id, sc.name, sc.display_order
ORDER BY sc.display_order;

CREATE VIEW tactical_insights 
WITH (security_invoker=on) AS
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

CREATE VIEW shot_hand_analysis 
WITH (security_invoker=on) AS
SELECT 
  m.id AS match_id,
  sh.name AS shot_name,
  p.winning_hand AS hand,
  COUNT(*) AS total_shots,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS wins,
  SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS losses,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / COUNT(*), 1) AS success_rate
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots sh ON sh.id = p.winning_shot_id
WHERE p.winning_hand IS NOT NULL
GROUP BY m.id, sh.name, p.winning_hand;

CREATE VIEW player_shot_breakdown 
WITH (security_invoker=on) AS
SELECT 
  m.id AS match_id,
  sh.name,
  sc.name AS category,
  -- Won with: Player won using this shot
  SUM(CASE WHEN p.winner = 'player' AND p.winning_shot_id = sh.id THEN 1 ELSE 0 END) AS won_with,
  -- Lost with: Player lost trying to use this shot (opponent won against player's shot)
  SUM(CASE WHEN p.winner = 'opponent' AND p.other_shot_id = sh.id THEN 1 ELSE 0 END) AS lost_with,
  -- Won against: Player won when opponent used this shot
  SUM(CASE WHEN p.winner = 'player' AND p.other_shot_id = sh.id THEN 1 ELSE 0 END) AS won_against,
  -- Lost against: Player lost when opponent used this shot
  SUM(CASE WHEN p.winner = 'opponent' AND p.winning_shot_id = sh.id THEN 1 ELSE 0 END) AS lost_against,
  -- Total times player used this shot
  SUM(CASE WHEN (p.winner = 'player' AND p.winning_shot_id = sh.id) OR (p.winner = 'opponent' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) AS player_total,
  -- Total times opponent used this shot
  SUM(CASE WHEN (p.winner = 'opponent' AND p.winning_shot_id = sh.id) OR (p.winner = 'player' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) AS opponent_total,
  -- Win percentage when player uses this shot (won_with / (won_with + lost_with))
  CASE 
    WHEN SUM(CASE WHEN (p.winner = 'player' AND p.winning_shot_id = sh.id) OR (p.winner = 'opponent' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) > 0
    THEN ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' AND p.winning_shot_id = sh.id THEN 1 ELSE 0 END) / 
                 SUM(CASE WHEN (p.winner = 'player' AND p.winning_shot_id = sh.id) OR (p.winner = 'opponent' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END), 1)
    ELSE 0 
  END AS player_success_rate
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots sh ON sh.id = p.winning_shot_id OR sh.id = p.other_shot_id
JOIN shot_categories sc ON sc.id = sh.category_id
GROUP BY m.id, sh.id, sh.name, sc.name, sc.display_order
HAVING SUM(CASE WHEN (p.winner = 'player' AND p.winning_shot_id = sh.id) OR (p.winner = 'opponent' AND p.other_shot_id = sh.id) OR (p.winner = 'opponent' AND p.winning_shot_id = sh.id) OR (p.winner = 'player' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) > 0
ORDER BY sc.display_order, sh.display_order;

CREATE VIEW player_shot_distribution 
WITH (security_invoker=on) AS
SELECT 
  m.id AS match_id,
  sh.name,
  sc.name AS category,
  -- When player uses this shot
  SUM(CASE WHEN (p.winner = 'player' AND p.winning_shot_id = sh.id) OR (p.winner = 'opponent' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) AS player_usage,
  SUM(CASE WHEN p.winner = 'player' AND p.winning_shot_id = sh.id THEN 1 ELSE 0 END) AS player_wins,
  SUM(CASE WHEN p.winner = 'opponent' AND p.other_shot_id = sh.id THEN 1 ELSE 0 END) AS player_losses,
  -- When opponent uses this shot
  SUM(CASE WHEN (p.winner = 'opponent' AND p.winning_shot_id = sh.id) OR (p.winner = 'player' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) AS opponent_usage,
  SUM(CASE WHEN p.winner = 'opponent' AND p.winning_shot_id = sh.id THEN 1 ELSE 0 END) AS opponent_wins,
  SUM(CASE WHEN p.winner = 'player' AND p.other_shot_id = sh.id THEN 1 ELSE 0 END) AS opponent_losses,
  -- Success rates
  CASE 
    WHEN SUM(CASE WHEN (p.winner = 'player' AND p.winning_shot_id = sh.id) OR (p.winner = 'opponent' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) > 0
    THEN ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' AND p.winning_shot_id = sh.id THEN 1 ELSE 0 END) / 
                 SUM(CASE WHEN (p.winner = 'player' AND p.winning_shot_id = sh.id) OR (p.winner = 'opponent' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END), 1)
    ELSE 0 
  END AS player_success_rate,
  CASE 
    WHEN SUM(CASE WHEN (p.winner = 'opponent' AND p.winning_shot_id = sh.id) OR (p.winner = 'player' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) > 0
    THEN ROUND(100.0 * SUM(CASE WHEN p.winner = 'opponent' AND p.winning_shot_id = sh.id THEN 1 ELSE 0 END) / 
                 SUM(CASE WHEN (p.winner = 'opponent' AND p.winning_shot_id = sh.id) OR (p.winner = 'player' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END), 1)
    ELSE 0 
  END AS opponent_success_rate
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots sh ON sh.id = p.winning_shot_id OR sh.id = p.other_shot_id
JOIN shot_categories sc ON sc.id = sh.category_id
GROUP BY m.id, sh.id, sh.name, sc.name, sc.display_order
HAVING SUM(CASE WHEN (p.winner = 'player' AND p.winning_shot_id = sh.id) OR (p.winner = 'opponent' AND p.other_shot_id = sh.id) OR (p.winner = 'opponent' AND p.winning_shot_id = sh.id) OR (p.winner = 'player' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) > 0
ORDER BY sc.display_order, sh.display_order;

-- Grant permissions (views inherit the security context of the querying user)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;