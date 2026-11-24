-- AI match summaries
--
-- 1. profiles.ai_summaries_enabled: off for everyone. Only admins can update
--    profiles, so only admins can turn it on for a user.
-- 2. match_summaries: the latest summary for each match, written only by the
--    match-summary Edge Function with the service role. The owner can read it,
--    and so can anyone with the match's share token. The owner's notes for
--    the next rewrite sit in match_summary_notes, which only the owner can read.
-- 3. ai_usage: one row per model call, with its tokens and cost, kept when the
--    match is deleted so the month's spend stays correct. Admins can read it.
-- 4. ai_settings: a single row holding the monthly budget. The function
--    refuses new summaries once the month's spend reaches it.

-- 1. Per-user flag

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_summaries_enabled BOOLEAN NOT NULL DEFAULT false;

GRANT UPDATE (ai_summaries_enabled) ON public.profiles TO authenticated;

-- 2. Summaries

CREATE TABLE IF NOT EXISTS public.match_summaries (
  match_id UUID PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  summary JSONB NOT NULL,
  -- SHA-256 of the model input, so the page can tell when the points have changed
  input_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.match_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their match summaries"
  ON public.match_summaries FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_summaries.match_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Anyone with the share token can view its summary"
  ON public.match_summaries FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_summaries.match_id
      AND m.share_token IS NOT NULL
      AND m.share_token = public.request_share_token()
  ));

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.match_summaries FROM anon, authenticated;
GRANT SELECT ON public.match_summaries TO anon, authenticated;

-- The owner's notes on a summary, sent to the model when it rewrites it. Kept
-- apart from match_summaries so a share link shows the summary but not the
-- notes. Written only by the Edge Function.

CREATE TABLE IF NOT EXISTS public.match_summary_notes (
  match_id UUID PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  notes TEXT NOT NULL CHECK (char_length(notes) <= 1000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.match_summary_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their summary notes"
  ON public.match_summary_notes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_summary_notes.match_id AND m.user_id = auth.uid()
  ));

REVOKE ALL ON public.match_summary_notes FROM anon, authenticated;
GRANT SELECT ON public.match_summary_notes TO authenticated;

-- 3. Usage log

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd NUMERIC(10, 6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_created_at_idx ON public.ai_usage (created_at);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AI usage"
  ON public.ai_usage FOR SELECT
  TO authenticated
  USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ai_usage FROM anon, authenticated;
REVOKE SELECT ON public.ai_usage FROM anon;
GRANT SELECT ON public.ai_usage TO authenticated;

-- 4. Budget

CREATE TABLE IF NOT EXISTS public.ai_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  monthly_budget_usd NUMERIC(8, 2) NOT NULL DEFAULT 20 CHECK (monthly_budget_usd >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.ai_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER update_ai_settings_updated_at BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AI settings"
  ON public.ai_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can change AI settings"
  ON public.ai_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE ALL ON public.ai_settings FROM anon, authenticated;
GRANT SELECT ON public.ai_settings TO authenticated;
GRANT UPDATE (monthly_budget_usd) ON public.ai_settings TO authenticated;
