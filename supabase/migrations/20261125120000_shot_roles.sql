-- Shot roles for shot balance on the analysis page
--
-- Each shot is an attack, a control shot at the table, or defence away from
-- it. A shot with no role (serve, no shot, service fault) is left out of shot
-- balance. Admins change roles on /admin/shots.
--
-- Defaults are seeded by shot name, whatever the category, so the pips
-- versions take the same role as the inverted ones.

ALTER TABLE public.shots
  ADD COLUMN IF NOT EXISTS role TEXT
    CHECK (role IN ('attack', 'control', 'defence'));

UPDATE public.shots
SET role = CASE
  WHEN name IN ('loop', 'counter_loop', 'flat_hit', 'smash', 'flick', 'attack', 'sideswipe') THEN 'attack'
  WHEN name IN ('push', 'block', 'bump', 'chop_block') THEN 'control'
  WHEN name IN ('chop', 'fish', 'lob') THEN 'defence'
END
WHERE role IS NULL;
