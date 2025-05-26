-- Add lucky shot and service fault tracking to points table

-- Add new columns to points table
ALTER TABLE public.points ADD COLUMN IF NOT EXISTS is_lucky_shot BOOLEAN DEFAULT false;
ALTER TABLE public.points ADD COLUMN IF NOT EXISTS is_service_fault BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.points.is_lucky_shot IS 'Tracks whether the winning shot was a lucky shot (e.g., hit net or edge)';
COMMENT ON COLUMN public.points.is_service_fault IS 'Tracks whether the point was won due to a service fault';