-- Chop block defends with backspin, like a chop, so it counts as defence in
-- shot balance. Production was already set this way on /admin/shots.
UPDATE shots SET role = 'defence' WHERE name = 'chop_block';
