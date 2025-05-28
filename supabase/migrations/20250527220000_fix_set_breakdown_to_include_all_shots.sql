-- Fix set breakdown to include both winning and other shots like player_shot_breakdown does
-- This addresses the issue where set-by-set numbers don't match the overall breakdown table

-- Drop and recreate set_breakdown view to include both winning_shot_id and other_shot_id
DROP VIEW IF EXISTS set_breakdown;
CREATE OR REPLACE VIEW set_breakdown AS
WITH all_shots_per_set AS (
  -- Player's shots when they win points (winning_shot belongs to player)
  SELECT 
    m.id AS match_id,
    s.set_number,
    sh.id AS shot_id,
    sh.name AS shot_name,
    1 AS player_wins,
    0 AS player_losses
  FROM matches m
  JOIN sets s ON s.match_id = m.id
  JOIN points p ON p.set_id = s.id
  JOIN shots sh ON sh.id = p.winning_shot_id
  WHERE p.winner = 'player'
  
  UNION ALL
  
  -- Player's shots when they lose points (other_shot belongs to player)
  SELECT 
    m.id AS match_id,
    s.set_number,
    sh.id AS shot_id,
    sh.name AS shot_name,
    0 AS player_wins,
    1 AS player_losses
  FROM matches m
  JOIN sets s ON s.match_id = m.id
  JOIN points p ON p.set_id = s.id
  JOIN shots sh ON sh.id = p.other_shot_id
  WHERE p.winner = 'opponent'
)
SELECT 
  match_id,
  set_number,
  shot_id,
  shot_name,
  SUM(player_wins + player_losses) AS total_shots_in_set,
  SUM(player_wins) AS wins_in_set,
  SUM(player_losses) AS losses_in_set
FROM all_shots_per_set
GROUP BY match_id, set_number, shot_id, shot_name;

-- Grant access to the updated view
ALTER VIEW set_breakdown OWNER TO postgres;
GRANT SELECT ON set_breakdown TO authenticated;
GRANT SELECT ON set_breakdown TO anon;