-- Restore the analysis views that 20250917000000_fix_security_advisories.sql
-- recreated from stale definitions, keeping security_invoker so RLS applies.
--
-- Shot ownership on a point:
--   winner = 'player'   -> winning_shot/winning_hand are the player's, other_shot/other_hand the opponent's
--   winner = 'opponent' -> winning_shot/winning_hand are the opponent's, other_shot/other_hand the player's
--
-- The 'no_shot' placeholder (recorded as the other shot on a service fault) is
-- excluded everywhere: it isn't a shot, and its hand is a hard-coded default.
--
-- Also adds:
--   matches.best_of   - number of sets the match is played over
--   matches.is_shared - opt-in public read access for the shared analysis link
--   matches.is_complete - set when a match ends, including when the last set
--                         is ended early, so reopening it shows the result

-- Match settings ------------------------------------------------------------

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS best_of SMALLINT NOT NULL DEFAULT 5
    CHECK (best_of IN (1, 3, 5, 7));

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_complete BOOLEAN NOT NULL DEFAULT FALSE;

-- Shared analysis access ----------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view shared matches" ON public.matches;
CREATE POLICY "Anyone can view shared matches"
  ON public.matches FOR SELECT
  TO anon, authenticated
  USING (is_shared);

DROP POLICY IF EXISTS "Anyone can view sets from shared matches" ON public.sets;
CREATE POLICY "Anyone can view sets from shared matches"
  ON public.sets FOR SELECT
  TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = sets.match_id AND m.is_shared));

DROP POLICY IF EXISTS "Anyone can view points from shared matches" ON public.points;
CREATE POLICY "Anyone can view points from shared matches"
  ON public.points FOR SELECT
  TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = points.match_id AND m.is_shared));

-- Views ---------------------------------------------------------------------

DROP VIEW IF EXISTS public.match_summary CASCADE;
DROP VIEW IF EXISTS public.most_effective_shots CASCADE;
DROP VIEW IF EXISTS public.most_costly_shots CASCADE;
DROP VIEW IF EXISTS public.shot_distribution CASCADE;
DROP VIEW IF EXISTS public.player_shot_distribution CASCADE;
DROP VIEW IF EXISTS public.opponent_hand_analysis CASCADE;
DROP VIEW IF EXISTS public.hand_analysis CASCADE;
DROP VIEW IF EXISTS public.shot_hand_analysis CASCADE;
DROP VIEW IF EXISTS public.player_shot_breakdown CASCADE;
DROP VIEW IF EXISTS public.set_breakdown CASCADE;
DROP VIEW IF EXISTS public.category_breakdown CASCADE;
DROP VIEW IF EXISTS public.tactical_insights CASCADE;

CREATE VIEW public.match_summary
WITH (security_invoker = on) AS
SELECT
  m.id AS match_id,
  m.opponent_name,
  m.date,
  m.match_score,
  m.best_of,
  m.is_shared,
  COUNT(p.id) AS total_points,
  COALESCE(SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END), 0) AS points_won,
  COALESCE(SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END), 0) AS points_lost,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / NULLIF(COUNT(p.id), 0), 1) AS points_win_percentage
FROM public.matches m
LEFT JOIN public.points p ON p.match_id = m.id
GROUP BY m.id;

-- One row per shot played on a point, attributed to whoever played it.
-- The other views build on it. security_invoker means callers need SELECT on
-- it, and RLS on points/sets still decides which rows they see.
CREATE VIEW public.point_shots
WITH (security_invoker = on) AS
SELECT
  p.match_id,
  s.set_number,
  p.id AS point_id,
  CASE WHEN p.winner = 'player' THEN 'player' ELSE 'opponent' END AS player_type,
  p.winning_shot_id AS shot_id,
  p.winning_hand AS hand,
  1 AS wins,
  0 AS losses
FROM public.points p
JOIN public.sets s ON s.id = p.set_id
UNION ALL
SELECT
  p.match_id,
  s.set_number,
  p.id AS point_id,
  CASE WHEN p.winner = 'player' THEN 'opponent' ELSE 'player' END AS player_type,
  p.other_shot_id AS shot_id,
  p.other_hand AS hand,
  0 AS wins,
  1 AS losses
FROM public.points p
JOIN public.sets s ON s.id = p.set_id;

CREATE VIEW public.hand_analysis
WITH (security_invoker = on) AS
SELECT
  ps.match_id,
  ps.player_type,
  ps.hand,
  SUM(ps.wins + ps.losses) AS total_shots,
  SUM(ps.wins) AS wins,
  SUM(ps.losses) AS losses,
  ROUND(100.0 * SUM(ps.wins) / SUM(ps.wins + ps.losses), 1) AS success_rate
FROM public.point_shots ps
JOIN public.shots sh ON sh.id = ps.shot_id
WHERE ps.hand IS NOT NULL
  AND sh.name NOT IN ('no_shot', 'service_fault')
GROUP BY ps.match_id, ps.player_type, ps.hand;

CREATE VIEW public.shot_hand_analysis
WITH (security_invoker = on) AS
SELECT
  ps.match_id,
  ps.player_type,
  sh.id AS shot_id,
  sh.name AS shot_name,
  ps.hand,
  SUM(ps.wins + ps.losses) AS total_shots,
  SUM(ps.wins) AS wins,
  SUM(ps.losses) AS losses,
  ROUND(100.0 * SUM(ps.wins) / SUM(ps.wins + ps.losses), 1) AS success_rate
FROM public.point_shots ps
JOIN public.shots sh ON sh.id = ps.shot_id
WHERE ps.hand IS NOT NULL
  AND sh.name <> 'no_shot'
GROUP BY ps.match_id, ps.player_type, sh.id, sh.name, ps.hand;

CREATE VIEW public.player_shot_breakdown
WITH (security_invoker = on) AS
SELECT
  ps.match_id,
  sh.id AS shot_id,
  sh.name,
  sc.name AS category,
  SUM(CASE WHEN ps.player_type = 'player' THEN ps.wins ELSE 0 END) AS won_with,
  SUM(CASE WHEN ps.player_type = 'player' THEN ps.losses ELSE 0 END) AS lost_with,
  SUM(CASE WHEN ps.player_type = 'opponent' THEN ps.losses ELSE 0 END) AS won_against,
  SUM(CASE WHEN ps.player_type = 'opponent' THEN ps.wins ELSE 0 END) AS lost_against,
  SUM(CASE WHEN ps.player_type = 'player' THEN 1 ELSE 0 END) AS player_total,
  SUM(CASE WHEN ps.player_type = 'opponent' THEN 1 ELSE 0 END) AS opponent_total,
  COALESCE(ROUND(
    100.0 * SUM(CASE WHEN ps.player_type = 'player' THEN ps.wins ELSE 0 END)
    / NULLIF(SUM(CASE WHEN ps.player_type = 'player' THEN 1 ELSE 0 END), 0), 1), 0) AS player_success_rate
FROM public.point_shots ps
JOIN public.shots sh ON sh.id = ps.shot_id
JOIN public.shot_categories sc ON sc.id = sh.category_id
WHERE sh.name <> 'no_shot'
GROUP BY ps.match_id, sh.id, sh.name, sc.name, sc.display_order, sh.display_order
ORDER BY sc.display_order, sh.display_order;

CREATE VIEW public.set_breakdown
WITH (security_invoker = on) AS
SELECT
  ps.match_id,
  ps.set_number,
  sh.id AS shot_id,
  sh.name AS shot_name,
  COUNT(*) AS total_shots_in_set,
  SUM(ps.wins) AS wins_in_set,
  SUM(ps.losses) AS losses_in_set
FROM public.point_shots ps
JOIN public.shots sh ON sh.id = ps.shot_id
WHERE ps.player_type = 'player'
  AND sh.name <> 'no_shot'
GROUP BY ps.match_id, ps.set_number, sh.id, sh.name;

CREATE VIEW public.category_breakdown
WITH (security_invoker = on) AS
SELECT
  ps.match_id,
  sc.name AS category,
  COUNT(*) AS total_shots,
  SUM(ps.wins) AS wins,
  SUM(ps.losses) AS losses,
  ROUND(100.0 * SUM(ps.wins) / COUNT(*), 1) AS success_rate
FROM public.point_shots ps
JOIN public.shots sh ON sh.id = ps.shot_id
JOIN public.shot_categories sc ON sc.id = sh.category_id
WHERE ps.player_type = 'player'
  AND sh.name <> 'no_shot'
GROUP BY ps.match_id, sc.id, sc.name, sc.display_order
ORDER BY sc.display_order;

-- How the player fares against each opponent shot (at least 3 encounters).
CREATE VIEW public.tactical_insights
WITH (security_invoker = on) AS
SELECT
  ps.match_id,
  sh.id AS shot_id,
  sh.name AS opponent_shot,
  COUNT(*) AS total_encounters,
  SUM(ps.losses) AS wins,
  SUM(ps.wins) AS losses,
  ROUND(100.0 * SUM(ps.losses) / COUNT(*), 1) AS win_percentage
FROM public.point_shots ps
JOIN public.shots sh ON sh.id = ps.shot_id
WHERE ps.player_type = 'opponent'
  AND sh.name <> 'no_shot'
GROUP BY ps.match_id, sh.id, sh.name
HAVING COUNT(*) >= 3
ORDER BY win_percentage DESC;

GRANT SELECT ON public.match_summary, public.point_shots, public.hand_analysis, public.shot_hand_analysis, public.player_shot_breakdown,
  public.set_breakdown, public.category_breakdown, public.tactical_insights
  TO anon, authenticated;
