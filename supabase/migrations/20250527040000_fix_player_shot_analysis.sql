-- Fix shot analysis to track player's shot usage and success rate
-- This replaces the flawed logic that only looked at winning shots

-- Drop existing views
DROP VIEW IF EXISTS most_costly_shots;
DROP VIEW IF EXISTS most_effective_shots;  
DROP VIEW IF EXISTS shot_distribution;

-- Create new view that tracks player's shot usage correctly
CREATE OR REPLACE VIEW player_shot_distribution AS
WITH player_shots AS (
  -- Get all shots used by the player (both when winning and losing points)
  SELECT 
    m.id AS match_id,
    sh.name AS shot_name,
    CASE 
      WHEN p.winner = 'player' THEN 'win'
      ELSE 'loss'
    END AS outcome
  FROM matches m
  JOIN sets s ON s.match_id = m.id
  JOIN points p ON p.set_id = s.id
  JOIN shots sh ON sh.id = CASE 
    WHEN p.winner = 'player' THEN p.winning_shot_id  -- Player won with this shot
    ELSE p.other_shot_id                             -- Player lost using this shot
  END
)
SELECT 
  match_id,
  shot_name AS name,
  COUNT(*) AS total_usage,
  SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) AS wins,
  SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END) AS losses,
  ROUND(100.0 * SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) / COUNT(*), 1) AS success_rate,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY match_id), 1) AS usage_percentage
FROM player_shots
GROUP BY match_id, shot_name;

-- Most effective shots: highest success rate with minimum usage
CREATE OR REPLACE VIEW most_effective_shots AS
SELECT 
  match_id,
  name,
  total_usage AS total_shots,
  wins,
  losses,
  success_rate,
  usage_percentage AS percentage_of_total
FROM player_shot_distribution
WHERE total_usage >= 3  -- Minimum 3 total uses for statistical relevance
ORDER BY success_rate DESC;

-- Most costly shots: lowest success rate with minimum usage
CREATE OR REPLACE VIEW most_costly_shots AS
SELECT 
  match_id,
  name,
  total_usage AS total_shots,
  wins,
  losses,
  success_rate,
  usage_percentage AS percentage_of_total
FROM player_shot_distribution
WHERE total_usage >= 3  -- Minimum 3 total uses for statistical relevance
ORDER BY success_rate ASC;

-- Create a backward-compatible shot_distribution view for any existing code
CREATE OR REPLACE VIEW shot_distribution AS
SELECT 
  match_id,
  name,
  total_usage AS total_shots,
  wins,
  losses,
  success_rate,
  usage_percentage AS percentage_of_total
FROM player_shot_distribution;