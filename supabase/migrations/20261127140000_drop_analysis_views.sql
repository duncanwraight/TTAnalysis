-- The analysis page and the coach's summary build everything from the raw
-- tables in src/lib/analysis.ts, so nothing reads these views any more.
-- The views built on point_shots go first, then point_shots itself.
drop view if exists public.category_breakdown;
drop view if exists public.hand_analysis;
drop view if exists public.player_shot_breakdown;
drop view if exists public.set_breakdown;
drop view if exists public.shot_hand_analysis;
drop view if exists public.tactical_insights;
drop view if exists public.point_shots;
drop view if exists public.match_summary;
