-- Players, styles of play, and the notes the coach's summary uses with them.
--
-- play_styles: preset styles an admin manages. Each carries tactical notes for
--   playing as the style and for playing against it.
-- kit_notes: tactical notes for playing against a left-hander or a rubber
--   other than inverted, so a style doesn't need a copy for every rubber.
-- style_matchups: extra tactics for one pairing, one way round: the player's
--   style, then the opponent's.
-- players: the account owner and the people whose matches they enter. Owner
--   only, because the notes are about a player's weaknesses. A player's style,
--   hand and rubbers fill in each new match; the notes feed the technical
--   advice in the coach's summary.
-- matches: which player the match is about, and both sides' style, hand and
--   rubbers as they were for this match. player_name stays as the displayed
--   name, kept in step with the player's name by a trigger, because share
--   links can't read players.

-- Styles, readable by anyone like shots, written by admins

CREATE TABLE public.play_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 60),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 160),
  as_notes TEXT NOT NULL DEFAULT '' CHECK (char_length(as_notes) <= 800),
  against_notes TEXT NOT NULL DEFAULT '' CHECK (char_length(against_notes) <= 800),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.kit_notes (
  key TEXT PRIMARY KEY CHECK (key IN ('left_handed', 'short_pips', 'medium_pips', 'long_pips', 'anti')),
  against_notes TEXT NOT NULL DEFAULT '' CHECK (char_length(against_notes) <= 800),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.style_matchups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_style_id UUID NOT NULL REFERENCES public.play_styles(id) ON DELETE CASCADE,
  opponent_style_id UUID NOT NULL REFERENCES public.play_styles(id) ON DELETE CASCADE,
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 800),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_style_id, opponent_style_id)
);

ALTER TABLE public.play_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_matchups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view styles" ON public.play_styles FOR SELECT USING (true);
CREATE POLICY "Admins can add styles" ON public.play_styles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can change styles" ON public.play_styles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete styles" ON public.play_styles FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "Anyone can view kit notes" ON public.kit_notes FOR SELECT USING (true);
CREATE POLICY "Admins can change kit notes" ON public.kit_notes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can view match-ups" ON public.style_matchups FOR SELECT USING (true);
CREATE POLICY "Admins can add match-ups" ON public.style_matchups FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can change match-ups" ON public.style_matchups FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete match-ups" ON public.style_matchups FOR DELETE TO authenticated USING (public.is_admin());

-- Kit notes are a fixed list: rows are seeded here and only their notes change
REVOKE INSERT, DELETE ON public.kit_notes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.play_styles, public.style_matchups FROM anon;
REVOKE UPDATE ON public.kit_notes FROM anon;

INSERT INTO public.kit_notes (key) VALUES ('left_handed'), ('short_pips'), ('medium_pips'), ('long_pips'), ('anti');

-- Starting styles. Their notes are written on /admin/styles.
INSERT INTO public.play_styles (name, description, display_order) VALUES
  ('Two-winged looper', 'Topspin from both wings, from the table and a step back', 1),
  ('Forehand attacker', 'Steps round to play the forehand wherever possible', 2),
  ('Close-to-table hitter', 'Stays at the table, flat hits and fast blocks', 3),
  ('Blocker', 'Lets the opponent attack and blocks it back, often with pips', 4),
  ('Chopper', 'Defends from distance with backspin and attacks the loose ball', 5),
  ('All-rounder', 'Mixes attack and control, no fixed way of playing', 6);

-- Players, owner only

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  is_self BOOLEAN NOT NULL DEFAULT false,
  style_id UUID REFERENCES public.play_styles(id) ON DELETE SET NULL,
  hand TEXT CHECK (hand IN ('right', 'left')),
  forehand_rubber TEXT CHECK (forehand_rubber IN ('inverted', 'short_pips', 'medium_pips', 'long_pips', 'anti')),
  backhand_rubber TEXT CHECK (backhand_rubber IN ('inverted', 'short_pips', 'medium_pips', 'long_pips', 'anti')),
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX players_one_self_per_user ON public.players (user_id) WHERE is_self;
CREATE INDEX players_user_id ON public.players (user_id);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own players" ON public.players FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can add own players" ON public.players FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can change own players" ON public.players FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own players" ON public.players FOR DELETE TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.players FROM anon;

-- Match columns

ALTER TABLE public.matches
  ADD COLUMN player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  ADD COLUMN player_style_id UUID REFERENCES public.play_styles(id) ON DELETE SET NULL,
  ADD COLUMN player_hand TEXT CHECK (player_hand IN ('right', 'left')),
  ADD COLUMN player_forehand_rubber TEXT CHECK (player_forehand_rubber IN ('inverted', 'short_pips', 'medium_pips', 'long_pips', 'anti')),
  ADD COLUMN player_backhand_rubber TEXT CHECK (player_backhand_rubber IN ('inverted', 'short_pips', 'medium_pips', 'long_pips', 'anti')),
  ADD COLUMN opponent_style_id UUID REFERENCES public.play_styles(id) ON DELETE SET NULL,
  ADD COLUMN opponent_hand TEXT CHECK (opponent_hand IN ('right', 'left')),
  ADD COLUMN opponent_forehand_rubber TEXT CHECK (opponent_forehand_rubber IN ('inverted', 'short_pips', 'medium_pips', 'long_pips', 'anti')),
  ADD COLUMN opponent_backhand_rubber TEXT CHECK (opponent_backhand_rubber IN ('inverted', 'short_pips', 'medium_pips', 'long_pips', 'anti'));

CREATE INDEX matches_player_id ON public.matches (player_id);

-- A match can only point at one of its owner's players
CREATE FUNCTION public.check_match_player()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.players p WHERE p.id = NEW.player_id AND p.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'The player must be one of your own players';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER matches_check_player
  BEFORE INSERT OR UPDATE OF player_id, user_id ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.check_match_player();

-- Renaming a player renames them on their matches, which is what share links show
CREATE FUNCTION public.sync_player_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.matches SET player_name = NEW.name WHERE player_id = NEW.id AND player_name IS DISTINCT FROM NEW.name;
  RETURN NEW;
END;
$$;

CREATE TRIGGER players_sync_name
  AFTER UPDATE OF name ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.sync_player_name();

REVOKE EXECUTE ON FUNCTION public.check_match_player() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_player_name() FROM PUBLIC, anon, authenticated;

-- Players from existing matches. Each account gets itself as a player: named
-- from its saved name, or 'Me' if it has none. Matches with no player name, or
-- the account's own name, are its own. Every other name becomes a player,
-- matched without regard to case or surrounding spaces.

INSERT INTO public.players (user_id, name, is_self)
SELECT u.id, COALESCE(NULLIF(trim(u.raw_user_meta_data->>'display_name'), ''), 'Me'), true
FROM auth.users u
WHERE EXISTS (SELECT 1 FROM public.matches m WHERE m.user_id = u.id)
   OR NULLIF(trim(u.raw_user_meta_data->>'display_name'), '') IS NOT NULL;

INSERT INTO public.players (user_id, name)
SELECT DISTINCT ON (m.user_id, lower(trim(m.player_name))) m.user_id, trim(m.player_name)
FROM public.matches m
JOIN public.players self ON self.user_id = m.user_id AND self.is_self
WHERE NULLIF(trim(m.player_name), '') IS NOT NULL
  AND lower(trim(m.player_name)) <> lower(self.name)
ORDER BY m.user_id, lower(trim(m.player_name)), m.created_at DESC;

UPDATE public.matches m
SET player_id = p.id
FROM public.players p
WHERE p.user_id = m.user_id
  AND (
    (p.is_self AND (NULLIF(trim(m.player_name), '') IS NULL OR lower(trim(m.player_name)) = lower(p.name)))
    OR (NOT p.is_self AND lower(trim(m.player_name)) = lower(p.name))
  );

-- How many matches use each style, on either side, for the admin page. Admins
-- can't read other people's matches, so this runs as its owner and returns
-- nothing to anyone else.
CREATE FUNCTION public.style_usage()
RETURNS TABLE (style_id UUID, matches BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id, count(m.id)
  FROM public.play_styles s
  LEFT JOIN public.matches m ON m.player_style_id = s.id OR m.opponent_style_id = s.id
  WHERE public.is_admin()
  GROUP BY s.id;
$$;

REVOKE EXECUTE ON FUNCTION public.style_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.style_usage() TO authenticated;
