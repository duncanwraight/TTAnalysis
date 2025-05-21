-- Seed data for TTAnalysis schema
-- Contains only essential data needed for application functionality

-- Insert test user in auth.users for our hardcoded test user ID
-- Note: This is for local development only
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    last_sign_in_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001',  -- hardcoded test user ID
    '00000000-0000-0000-0000-000000000000',  -- instance ID
    'authenticated',                         -- audience
    'authenticated',                         -- role
    'test@example.com',                      -- email
    NOW(),                                   -- email confirmed timestamp
    '{"provider": "email", "providers": ["email"]}', -- app metadata
    '{"name": "Test User"}',                 -- user metadata
    NOW(),                                   -- created at
    NOW(),                                   -- updated at
    NOW()                                    -- last sign in
)
ON CONFLICT (id) DO NOTHING;

-- The trigger created in the migration should automatically create this user in the public.users table

-- Insert shot categories
INSERT INTO public.shot_categories (id, name, display_order, created_at, updated_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'serve', 1, NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000002', 'around_net', 2, NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000003', 'pips', 3, NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000004', 'attacks', 4, NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000005', 'defence', 5, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Insert shots
-- Serves
INSERT INTO public.shots (id, category_id, name, display_name, display_order, created_at, updated_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'serve', 'Serve', 1, NOW(), NOW()),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'serve_receive', 'Serve receive', 2, NOW(), NOW())
ON CONFLICT (category_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Around the net
INSERT INTO public.shots (id, category_id, name, display_name, display_order, created_at, updated_at)
VALUES
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'push', 'Push', 1, NOW(), NOW()),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'flick', 'Flick', 2, NOW(), NOW())
ON CONFLICT (category_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Pips
INSERT INTO public.shots (id, category_id, name, display_name, display_order, created_at, updated_at)
VALUES
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'bump', 'Bump', 1, NOW(), NOW()),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'sideswipe', 'Sideswipe', 2, NOW(), NOW()),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 'attack', 'Attack', 3, NOW(), NOW())
ON CONFLICT (category_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Attacks
INSERT INTO public.shots (id, category_id, name, display_name, display_order, created_at, updated_at)
VALUES
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000004', 'flat_hit', 'Flat-hit', 1, NOW(), NOW()),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000004', 'loop', 'Loop', 2, NOW(), NOW()),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000004', 'smash', 'Smash', 3, NOW(), NOW()),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000004', 'counter_loop', 'Counter-loop', 4, NOW(), NOW())
ON CONFLICT (category_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Defence
INSERT INTO public.shots (id, category_id, name, display_name, display_order, created_at, updated_at)
VALUES
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000005', 'chop', 'Chop', 1, NOW(), NOW()),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000005', 'fish', 'Fish', 2, NOW(), NOW()),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000005', 'lob', 'Lob', 3, NOW(), NOW())
ON CONFLICT (category_id, name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();