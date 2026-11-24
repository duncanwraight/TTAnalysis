-- Shot guide for the AI summary
--
-- Each shot lists the qualities worth checking when it keeps losing points
-- (tactical: placement, length, height, spin, spin variation, speed, shot
-- selection) and free-text notes on what a technical fault looks like on video.
-- Both apply to the shot whatever the hand. The quality keys are defined in
-- src/lib/shotGuide.ts, which also holds what each one means to the model.
--
-- Defaults are seeded by shot name. Technical notes start empty: they are
-- written by an admin, and the model leaves technical advice out without them.

ALTER TABLE public.shots
  ADD COLUMN IF NOT EXISTS check_qualities TEXT[] NOT NULL DEFAULT '{}'
    CHECK (check_qualities <@ ARRAY['placement', 'length', 'height', 'spin', 'variation', 'speed', 'selection']),
  ADD COLUMN IF NOT EXISTS technical_notes TEXT
    CHECK (char_length(technical_notes) <= 600);

WITH defaults (name, pips, qualities) AS (
  VALUES
    ('serve',        false, ARRAY['placement', 'length', 'height', 'spin', 'variation']),
    ('push',         false, ARRAY['placement', 'length', 'height', 'spin', 'variation']),
    ('chop',         false, ARRAY['placement', 'length', 'height', 'spin', 'variation']),
    ('flick',        false, ARRAY['placement', 'spin', 'speed']),
    ('loop',         false, ARRAY['placement', 'spin', 'speed', 'selection']),
    ('counter_loop', false, ARRAY['placement', 'speed', 'selection']),
    ('flat_hit',     false, ARRAY['placement', 'speed', 'selection']),
    ('smash',        false, ARRAY['placement', 'selection']),
    ('block',        false, ARRAY['placement', 'speed']),
    ('fish',         false, ARRAY['placement', 'length', 'height']),
    ('lob',          false, ARRAY['placement', 'length', 'height']),
    ('push',         true,  ARRAY['placement', 'length', 'height', 'speed']),
    ('bump',         true,  ARRAY['placement', 'length', 'height', 'speed']),
    ('block',        true,  ARRAY['placement', 'length', 'height', 'speed']),
    ('chop_block',   true,  ARRAY['placement', 'length', 'height', 'speed']),
    ('attack',       true,  ARRAY['placement', 'speed', 'selection']),
    ('sideswipe',    true,  ARRAY['placement', 'speed', 'selection'])
)
UPDATE public.shots s
SET check_qualities = d.qualities
FROM defaults d, public.shot_categories c
WHERE c.id = s.category_id
  AND s.name = d.name
  AND (c.name = 'pips / anti') = d.pips
  AND s.check_qualities = '{}';
