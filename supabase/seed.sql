-- Seed data for Supabase Auth testing
-- This will initialize the auth schema and create test users and data

-- Add a test user with a known password for development
-- (Password is 'password123' - only for local development!)
INSERT INTO auth.users (
  id, 
  email,
  email_confirmed_at,
  encrypted_password,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at, 
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  now(),
  '$2a$10$kKNR1xjZ8nqj9gNsJI.WxePVMwIl2LGGgJJaPz.3YynJkGbxfD5T6', -- 'password123'
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test User"}',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Ensure we have a test user in our users table
-- (This should be synced with the auth.users table automatically by triggers, but we'll ensure it exists)
INSERT INTO public.users (id, email, name, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create some sample matches for the test user
INSERT INTO public.matches (id, user_id, opponent_name, date, match_score, initial_server)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'John Doe', '2023-01-15', '3-1', 'player'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Jane Smith', '2023-01-20', '2-3', 'opponent')
ON CONFLICT (id) DO NOTHING;

-- Create some sample sets for the first match
INSERT INTO public.sets (id, match_id, set_number, score, player_score, opponent_score)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, '11-8', 11, 8),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 2, '9-11', 9, 11),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 3, '11-5', 11, 5),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 4, '11-7', 11, 7)
ON CONFLICT (id) DO NOTHING;

-- Create some sample points
INSERT INTO public.points (id, set_id, point_number, winner, winning_shot, other_shot)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 'player', 'forehand', 'backhand'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 2, 'opponent', 'forehand', 'serve'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 3, 'player', 'backhand', 'forehand')
ON CONFLICT (id) DO NOTHING;