-- Match details for reviewing other people's matches as well as your own.
--
-- player_name: who the analysis is about. Empty on older matches, which were
--   always the account owner's own.
-- event: free text, e.g. "Winter 2026/27 league".
-- video_url: link to the match video. Only http(s) links are allowed, because
--   the analysis page renders it as a link and shared links show it to anyone.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS player_name TEXT
    CHECK (player_name IS NULL OR char_length(player_name) <= 100),
  ADD COLUMN IF NOT EXISTS event TEXT
    CHECK (event IS NULL OR char_length(event) <= 200),
  ADD COLUMN IF NOT EXISTS video_url TEXT
    CHECK (video_url IS NULL OR (char_length(video_url) <= 2000 AND video_url ~* '^https?://[^\s]+$'));
