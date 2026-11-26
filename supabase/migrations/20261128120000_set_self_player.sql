-- Lets an owner say which of their players is them. Before this the self
-- player could only come from the new match form, and the old form ticked
-- "This is me" by default, so some accounts ended up with a friend as "you".
--
-- Runs as the caller, so RLS limits it to their own players. The old self
-- player becomes an ordinary player and keeps the matches entered under their
-- name. Matches with no player name are the owner's own from before players
-- existed, so they move to the new self player and take its name.

CREATE FUNCTION public.set_self_player(target UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  old_self UUID;
  new_name TEXT;
BEGIN
  SELECT name INTO new_name FROM public.players WHERE id = target AND user_id = auth.uid();
  IF new_name IS NULL THEN
    RAISE EXCEPTION 'The player must be one of your own players';
  END IF;

  SELECT id INTO old_self FROM public.players WHERE user_id = auth.uid() AND is_self;
  IF old_self = target THEN
    RETURN;
  END IF;

  IF old_self IS NOT NULL THEN
    UPDATE public.players SET is_self = false, updated_at = now() WHERE id = old_self;
    UPDATE public.matches
    SET player_id = target, player_name = new_name
    WHERE user_id = auth.uid() AND player_id = old_self AND NULLIF(trim(player_name), '') IS NULL;
  END IF;

  UPDATE public.players SET is_self = true, updated_at = now() WHERE id = target;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_self_player(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_self_player(UUID) TO authenticated;
