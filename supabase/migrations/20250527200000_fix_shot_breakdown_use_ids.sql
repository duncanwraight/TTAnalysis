-- Fix shot breakdown to use shot IDs instead of names to prevent confusion between shots with same names
-- This addresses the issue where different Block shots in different categories were being mixed up

-- Drop and recreate shot_hand_analysis view to include shot_id
DROP VIEW IF EXISTS shot_hand_analysis;
CREATE OR REPLACE VIEW shot_hand_analysis AS
WITH all_shot_hands AS (
  -- Player's shot+hand when they win points (winning_shot + winning_hand belongs to player)
  SELECT 
    m.id AS match_id,
    'player' AS player_type,
    sh.id AS shot_id,
    sh.name AS shot_name,
    p.winning_hand AS hand,
    1 AS wins,
    0 AS losses
  FROM matches m
  JOIN sets s ON s.match_id = m.id
  JOIN points p ON p.set_id = s.id
  JOIN shots sh ON sh.id = p.winning_shot_id
  WHERE p.winner = 'player' AND p.winning_hand IS NOT NULL
  
  UNION ALL
  
  -- Player's shot+hand when they lose points (other_shot + other_hand belongs to player)
  SELECT 
    m.id AS match_id,
    'player' AS player_type,
    sh.id AS shot_id,
    sh.name AS shot_name,
    p.other_hand AS hand,
    0 AS wins,
    1 AS losses
  FROM matches m
  JOIN sets s ON s.match_id = m.id
  JOIN points p ON p.set_id = s.id
  JOIN shots sh ON sh.id = p.other_shot_id
  WHERE p.winner = 'opponent' AND p.other_hand IS NOT NULL
  
  UNION ALL
  
  -- Opponent's shot+hand when they win points (winning_shot + winning_hand belongs to opponent)
  SELECT 
    m.id AS match_id,
    'opponent' AS player_type,
    sh.id AS shot_id,
    sh.name AS shot_name,
    p.winning_hand AS hand,
    1 AS wins,
    0 AS losses
  FROM matches m
  JOIN sets s ON s.match_id = m.id
  JOIN points p ON p.set_id = s.id
  JOIN shots sh ON sh.id = p.winning_shot_id
  WHERE p.winner = 'opponent' AND p.winning_hand IS NOT NULL
  
  UNION ALL
  
  -- Opponent's shot+hand when they lose points (other_shot + other_hand belongs to opponent)
  SELECT 
    m.id AS match_id,
    'opponent' AS player_type,
    sh.id AS shot_id,
    sh.name AS shot_name,
    p.other_hand AS hand,
    0 AS wins,
    1 AS losses
  FROM matches m
  JOIN sets s ON s.match_id = m.id
  JOIN points p ON p.set_id = s.id
  JOIN shots sh ON sh.id = p.other_shot_id
  WHERE p.winner = 'player' AND p.other_hand IS NOT NULL
)
SELECT 
  match_id,
  player_type,
  shot_id,
  shot_name,
  hand,
  SUM(wins + losses) AS total_shots,
  SUM(wins) AS wins,
  SUM(losses) AS losses,
  ROUND(100.0 * SUM(wins) / SUM(wins + losses), 1) AS success_rate
FROM all_shot_hands
GROUP BY match_id, player_type, shot_id, shot_name, hand;

-- Drop and recreate player_shot_breakdown view to include shot_id for consistency
DROP VIEW IF EXISTS player_shot_breakdown;
CREATE OR REPLACE VIEW player_shot_breakdown AS
SELECT 
  m.id AS match_id,
  sh.id AS shot_id,
  sh.name,
  sc.name AS category,
  -- Won with: Player won using this shot
  SUM(CASE WHEN p.winner = 'player' AND p.winning_shot_id = sh.id THEN 1 ELSE 0 END) AS won_with,
  -- Lost with: Player lost trying to use this shot (opponent won against player's shot)
  SUM(CASE WHEN p.winner = 'opponent' AND p.other_shot_id = sh.id THEN 1 ELSE 0 END) AS lost_with,
  -- Won against: Player won when opponent used this shot
  SUM(CASE WHEN p.winner = 'player' AND p.other_shot_id = sh.id THEN 1 ELSE 0 END) AS won_against,
  -- Lost against: Player lost when opponent used this shot
  SUM(CASE WHEN p.winner = 'opponent' AND p.winning_shot_id = sh.id THEN 1 ELSE 0 END) AS lost_against,
  -- Total times player used this shot
  SUM(CASE WHEN (p.winner = 'player' AND p.winning_shot_id = sh.id) OR (p.winner = 'opponent' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) AS player_total,
  -- Total times opponent used this shot
  SUM(CASE WHEN (p.winner = 'opponent' AND p.winning_shot_id = sh.id) OR (p.winner = 'player' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) AS opponent_total,
  -- Win percentage when player uses this shot (won_with / (won_with + lost_with))
  CASE 
    WHEN SUM(CASE WHEN (p.winner = 'player' AND p.winning_shot_id = sh.id) OR (p.winner = 'opponent' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) > 0
    THEN ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' AND p.winning_shot_id = sh.id THEN 1 ELSE 0 END) / 
                 SUM(CASE WHEN (p.winner = 'player' AND p.winning_shot_id = sh.id) OR (p.winner = 'opponent' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END), 1)
    ELSE 0 
  END AS player_success_rate
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots sh ON sh.id = p.winning_shot_id OR sh.id = p.other_shot_id
JOIN shot_categories sc ON sc.id = sh.category_id
GROUP BY m.id, sh.id, sh.name, sc.name, sc.display_order
HAVING SUM(CASE WHEN (p.winner = 'player' AND p.winning_shot_id = sh.id) OR (p.winner = 'opponent' AND p.other_shot_id = sh.id) OR (p.winner = 'opponent' AND p.winning_shot_id = sh.id) OR (p.winner = 'player' AND p.other_shot_id = sh.id) THEN 1 ELSE 0 END) > 0
ORDER BY sc.display_order, sh.display_order;

-- Grant access to the updated views
ALTER VIEW shot_hand_analysis OWNER TO postgres;
GRANT SELECT ON shot_hand_analysis TO authenticated;
GRANT SELECT ON shot_hand_analysis TO anon;

ALTER VIEW player_shot_breakdown OWNER TO postgres;
GRANT SELECT ON player_shot_breakdown TO authenticated;
GRANT SELECT ON player_shot_breakdown TO anon;