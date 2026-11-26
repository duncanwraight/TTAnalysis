-- Saves edits to a match's points from the points editor in one go: the points,
-- the scores of the sets they moved, and the match result. Changing a point's
-- winner moves the set score, so the three must change together or not at all.
--
-- The editor works out the new scores with the same rules as the tracker
-- (src/lib/pointEdits.ts). This runs as the caller, so RLS limits it to their
-- own match, and every point and set must belong to that match.

CREATE FUNCTION public.edit_points(
  target_match UUID,
  point_edits JSONB,
  set_scores JSONB,
  new_match_score TEXT,
  new_is_complete BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  expected INT;
  changed INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id = target_match) THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  expected := jsonb_array_length(point_edits);
  UPDATE public.points p
  SET winner = e.winner,
      winning_shot_id = e.winning_shot_id,
      winning_hand = e.winning_hand,
      other_shot_id = e.other_shot_id,
      other_hand = e.other_hand,
      is_unforced_error = e.is_unforced_error,
      is_lucky_shot = e.is_lucky_shot,
      is_attacked_first = e.is_attacked_first,
      is_early_attack = e.is_early_attack
  FROM jsonb_to_recordset(point_edits) AS e(
    id UUID, winner TEXT, winning_shot_id UUID, winning_hand TEXT, other_shot_id UUID, other_hand TEXT,
    is_unforced_error BOOLEAN, is_lucky_shot BOOLEAN, is_attacked_first BOOLEAN, is_early_attack BOOLEAN
  )
  WHERE p.id = e.id AND p.match_id = target_match;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> expected THEN
    RAISE EXCEPTION 'Some of those points are not in this match';
  END IF;

  expected := jsonb_array_length(set_scores);
  UPDATE public.sets s
  SET player_score = e.player_score,
      opponent_score = e.opponent_score,
      score = e.score
  FROM jsonb_to_recordset(set_scores) AS e(id UUID, player_score INT, opponent_score INT, score TEXT)
  WHERE s.id = e.id AND s.match_id = target_match;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> expected THEN
    RAISE EXCEPTION 'Some of those sets are not in this match';
  END IF;

  UPDATE public.matches
  SET match_score = new_match_score, is_complete = new_is_complete
  WHERE id = target_match;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.edit_points(UUID, JSONB, JSONB, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_points(UUID, JSONB, JSONB, TEXT, BOOLEAN) TO authenticated;
