-- Share links by unguessable token
--
-- Replaces matches.is_shared with matches.share_token. Previously anyone with
-- the public anon key could list every shared match. Now a shared match is
-- only readable by a request that sends its token in the x-share-token header,
-- so a match can only be found through its link.
--
-- Sharing sets a new random token; stopping sharing sets it back to NULL,
-- which invalidates the old link.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE;

UPDATE public.matches
SET share_token = gen_random_uuid()
WHERE is_shared AND share_token IS NULL;

-- Old policies relied on is_shared
DROP POLICY IF EXISTS "Anyone can view shared matches" ON public.matches;
DROP POLICY IF EXISTS "Anyone can view sets from shared matches" ON public.sets;
DROP POLICY IF EXISTS "Anyone can view points from shared matches" ON public.points;

-- match_summary exposes the sharing column, so rebuild it without is_shared
DROP VIEW IF EXISTS public.match_summary;

ALTER TABLE public.matches DROP COLUMN IF EXISTS is_shared;

CREATE VIEW public.match_summary
WITH (security_invoker = on) AS
SELECT
  m.id AS match_id,
  m.user_id,
  m.opponent_name,
  m.date,
  m.match_score,
  m.best_of,
  m.share_token,
  COUNT(p.id) AS total_points,
  COALESCE(SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END), 0) AS points_won,
  COALESCE(SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END), 0) AS points_lost,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / NULLIF(COUNT(p.id), 0), 1) AS points_win_percentage
FROM public.matches m
LEFT JOIN public.points p ON p.match_id = m.id
GROUP BY m.id;

GRANT SELECT ON public.match_summary TO anon, authenticated;

-- The share token sent by the client, or NULL if missing or not a UUID
CREATE OR REPLACE FUNCTION public.request_share_token()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN h ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN h::uuid
  END
  FROM (
    SELECT NULLIF(current_setting('request.headers', true), '')::json ->> 'x-share-token' AS h
  ) headers
$$;

GRANT EXECUTE ON FUNCTION public.request_share_token() TO anon, authenticated;

CREATE POLICY "Anyone with the share token can view a match"
  ON public.matches FOR SELECT
  TO anon, authenticated
  USING (share_token IS NOT NULL AND share_token = public.request_share_token());

CREATE POLICY "Anyone with the share token can view its sets"
  ON public.sets FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = sets.match_id
      AND m.share_token IS NOT NULL
      AND m.share_token = public.request_share_token()
  ));

CREATE POLICY "Anyone with the share token can view its points"
  ON public.points FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = points.match_id
      AND m.share_token IS NOT NULL
      AND m.share_token = public.request_share_token()
  ));
