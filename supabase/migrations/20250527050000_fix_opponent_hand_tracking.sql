-- Fix hand analysis to correctly track player vs opponent hands
-- Current views incorrectly assume winning_hand always belongs to player

-- Drop existing hand analysis views
DROP VIEW IF EXISTS shot_hand_analysis;
DROP VIEW IF EXISTS hand_analysis;

-- Create corrected hand analysis that properly separates player and opponent
CREATE OR REPLACE VIEW hand_analysis AS
WITH all_hands AS (
  -- Player's hands when they win points (winning_hand belongs to player)
  SELECT 
    m.id AS match_id,
    'player' AS player_type,
    p.winning_hand AS hand,
    1 AS wins,
    0 AS losses
  FROM matches m
  JOIN sets s ON s.match_id = m.id
  JOIN points p ON p.set_id = s.id
  WHERE p.winner = 'player' AND p.winning_hand IS NOT NULL
  
  UNION ALL
  
  -- Player's hands when they lose points (other_hand belongs to player)
  SELECT 
    m.id AS match_id,
    'player' AS player_type,
    p.other_hand AS hand,
    0 AS wins,
    1 AS losses
  FROM matches m
  JOIN sets s ON s.match_id = m.id
  JOIN points p ON p.set_id = s.id
  WHERE p.winner = 'opponent' AND p.other_hand IS NOT NULL
  
  UNION ALL
  
  -- Opponent's hands when they win points (winning_hand belongs to opponent)
  SELECT 
    m.id AS match_id,
    'opponent' AS player_type,
    p.winning_hand AS hand,
    1 AS wins,
    0 AS losses
  FROM matches m
  JOIN sets s ON s.match_id = m.id
  JOIN points p ON p.set_id = s.id
  WHERE p.winner = 'opponent' AND p.winning_hand IS NOT NULL
  
  UNION ALL
  
  -- Opponent's hands when they lose points (other_hand belongs to opponent)
  SELECT 
    m.id AS match_id,
    'opponent' AS player_type,
    p.other_hand AS hand,
    0 AS wins,
    1 AS losses
  FROM matches m
  JOIN sets s ON s.match_id = m.id
  JOIN points p ON p.set_id = s.id
  WHERE p.winner = 'player' AND p.other_hand IS NOT NULL
)
SELECT 
  match_id,
  player_type,
  hand,
  SUM(wins + losses) AS total_shots,
  SUM(wins) AS wins,
  SUM(losses) AS losses,
  ROUND(100.0 * SUM(wins) / SUM(wins + losses), 1) AS success_rate
FROM all_hands
GROUP BY match_id, player_type, hand;

-- Create corrected shot+hand analysis
CREATE OR REPLACE VIEW shot_hand_analysis AS
WITH all_shot_hands AS (
  -- Player's shot+hand when they win points (winning_shot + winning_hand belongs to player)
  SELECT 
    m.id AS match_id,
    'player' AS player_type,
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
  shot_name,
  hand,
  SUM(wins + losses) AS total_shots,
  SUM(wins) AS wins,
  SUM(losses) AS losses,
  ROUND(100.0 * SUM(wins) / SUM(wins + losses), 1) AS success_rate
FROM all_shot_hands
GROUP BY match_id, player_type, shot_name, hand;