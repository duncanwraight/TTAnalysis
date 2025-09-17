-- Add "no shot" entry for service fault scenarios
-- When a point ends on a service fault, there is no opposing shot

-- First, get the serve category ID
INSERT INTO public.shots (
  id,
  category_id,
  name,
  display_name,
  description,
  display_order
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.shot_categories WHERE name = 'serve' LIMIT 1),
  'no_shot',
  'No shot',
  'No opposing shot (used for service faults)',
  99
);