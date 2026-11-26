-- Sharing a player's history by link.
--
-- A player gets a share_token, set when the owner shares their history and
-- cleared when they stop. A request that sends it in the x-share-token header
-- (the same header single-match links use) can read that player's matches,
-- with their sets, points and coach's summaries. Nothing else changes: players
-- stay owner only, so the player's notes are never readable, and summary notes
-- keep their owner-only policy.
--
-- players isn't readable by anon, so the token is resolved by a security
-- definer function rather than a subquery in each policy.

ALTER TABLE public.players
  ADD COLUMN share_token UUID UNIQUE;

-- The player whose history the request's share token opens, or NULL
CREATE FUNCTION public.shared_history_player_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.players
  WHERE share_token IS NOT NULL AND share_token = public.request_share_token()
$$;

REVOKE EXECUTE ON FUNCTION public.shared_history_player_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shared_history_player_id() TO anon, authenticated;

-- The shared player's name, style, hand and rubbers for the page header.
-- Never the notes.
CREATE FUNCTION public.shared_history_player()
RETURNS TABLE (
  id UUID,
  name TEXT,
  style_id UUID,
  hand TEXT,
  forehand_rubber TEXT,
  backhand_rubber TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.name, p.style_id, p.hand, p.forehand_rubber, p.backhand_rubber
  FROM public.players p
  WHERE p.share_token IS NOT NULL AND p.share_token = public.request_share_token()
$$;

REVOKE EXECUTE ON FUNCTION public.shared_history_player() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shared_history_player() TO anon, authenticated;

-- The (SELECT ...) wrappers let Postgres work the token out once per query
CREATE POLICY "Anyone with a player's history link can view their matches"
  ON public.matches FOR SELECT
  TO anon, authenticated
  USING (player_id IS NOT NULL AND player_id = (SELECT public.shared_history_player_id()));

CREATE POLICY "Anyone with a player's history link can view their sets"
  ON public.sets FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = sets.match_id
      AND m.player_id = (SELECT public.shared_history_player_id())
  ));

CREATE POLICY "Anyone with a player's history link can view their points"
  ON public.points FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = points.match_id
      AND m.player_id = (SELECT public.shared_history_player_id())
  ));

CREATE POLICY "Anyone with a player's history link can view their summaries"
  ON public.match_summaries FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_summaries.match_id
      AND m.player_id = (SELECT public.shared_history_player_id())
  ));
