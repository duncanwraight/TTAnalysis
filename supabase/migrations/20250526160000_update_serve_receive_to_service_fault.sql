-- Update serve_receive shot to service_fault

-- Update the shot name and display name for serve_receive to service_fault
UPDATE public.shots 
SET 
  name = 'service_fault',
  display_name = 'Service fault',
  description = 'Point won due to opponent service fault'
WHERE name = 'serve_receive' 
  AND category_id IN (SELECT id FROM public.shot_categories WHERE name = 'serve');