-- Add lucky shot tracking to points table

-- Add new column to points table
ALTER TABLE public.points ADD COLUMN IF NOT EXISTS is_lucky_shot BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.points.is_lucky_shot IS 'Tracks whether the winning shot was a lucky shot (e.g., hit net or edge)';