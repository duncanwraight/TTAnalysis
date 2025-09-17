-- Add "Push" shot to the Pips category
-- Push is a common shot type when playing with pips rubber

INSERT INTO public.shots (
  id,
  category_id,
  name,
  display_name,
  description,
  display_order
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.shot_categories WHERE name = 'pips' LIMIT 1),
  'push',
  'Push',
  'Defensive pushing shot typically used with pips rubber',
  2
);