-- Sweeps: going back through a match one point at a time to tick one thing.
--
-- is_attacked_first: the player being reviewed played the first attacking shot
--   of the point. Unticked means the opponent attacked first or nobody attacked.
-- is_third_ball_attack: the player served and attacked the ball after the
--   receive. That is always an attack first as well.
-- confirmed_tags: the tags the owner has confirmed are complete for the match,
--   by finishing a sweep or saying every one is ticked. The analysis treats an
--   unticked point as a "no" only once its tag is confirmed or has a tick.
-- sweep_progress: for a sweep stopped part way, the id of the next point to
--   answer, keyed by tag.

ALTER TABLE public.points
  ADD COLUMN IF NOT EXISTS is_attacked_first BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_third_ball_attack BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.points
  ADD CONSTRAINT points_third_ball_is_attacked_first
    CHECK (NOT is_third_ball_attack OR is_attacked_first);

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS confirmed_tags TEXT[] NOT NULL DEFAULT '{}'
    CHECK (confirmed_tags <@ ARRAY['unforced', 'attacked_first', 'third_ball', 'lucky']::TEXT[]),
  ADD COLUMN IF NOT EXISTS sweep_progress JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(sweep_progress) = 'object' AND pg_column_size(sweep_progress) <= 2000);

-- Unforced errors were ticked in the tracker before sweeps existed. Where a
-- match has any of the player's own ticked, take them as complete so the
-- analysis page doesn't ask about every old match.
UPDATE public.matches m
SET confirmed_tags = ARRAY['unforced']::TEXT[]
WHERE EXISTS (
  SELECT 1 FROM public.points p
  WHERE p.match_id = m.id AND p.winner = 'opponent' AND p.is_unforced_error
);
