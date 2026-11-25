-- The third-ball sweep becomes "attacked straight away": did the player attack
-- at their first chance? On their own serve that is the third ball, and on the
-- opponent's serve it is the receive. Existing third-ball ticks keep their
-- meaning, as the player's serve half of the new tag.
--
-- An unfinished third-ball sweep loses its place, because the new sweep also
-- covers the opponent's serves before it. Its ticks are kept.

ALTER TABLE public.points RENAME COLUMN is_third_ball_attack TO is_early_attack;
ALTER TABLE public.points RENAME CONSTRAINT points_third_ball_is_attacked_first TO points_early_attack_is_attacked_first;

ALTER TABLE public.matches DROP CONSTRAINT matches_confirmed_tags_check;

-- A confirmed third-ball sweep never covered the opponent's serves, so it no
-- longer counts as complete
UPDATE public.matches
SET confirmed_tags = array_remove(confirmed_tags, 'third_ball')
WHERE 'third_ball' = ANY (confirmed_tags);

UPDATE public.matches
SET sweep_progress = sweep_progress - 'third_ball'
WHERE sweep_progress ? 'third_ball';

ALTER TABLE public.matches
  ADD CONSTRAINT matches_confirmed_tags_check
    CHECK (confirmed_tags <@ ARRAY['unforced', 'attacked_first', 'early_attack', 'lucky']::TEXT[]);
