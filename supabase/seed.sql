-- Seed data for Supabase Auth testing
-- This will initialize the auth schema and create a test user

-- Initialize test user (Note: Password will be set when using UI)
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'test@example.com', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Ensure we have a test user in our users table 
-- (This should be synced with the auth.users table automatically by triggers, but we'll ensure it exists)
INSERT INTO public.users (id, email, name, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User', now(), now())
ON CONFLICT (id) DO NOTHING;