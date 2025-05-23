-- Match Summary View
CREATE OR REPLACE VIEW match_summary AS
SELECT 
  m.id AS match_id,
  m.opponent_name,
  m.date,
  m.match_score,
  COUNT(p.id) AS total_points,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS points_won,
  SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS points_lost,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / COUNT(p.id), 1) AS points_win_percentage
FROM matches m
LEFT JOIN sets s ON s.match_id = m.id
LEFT JOIN points p ON p.set_id = s.id
GROUP BY m.id, m.opponent_name, m.date, m.match_score;

-- Shot Distribution View
CREATE OR REPLACE VIEW shot_distribution AS
SELECT 
  m.id AS match_id,
  sh.name,
  COUNT(*) AS total_shots,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS wins,
  SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS losses,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / COUNT(*), 1) AS success_rate,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY m.id), 1) AS percentage_of_total
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots sh ON sh.id = p.winning_shot_id
GROUP BY m.id, sh.name;

-- Most Effective Shots View
CREATE OR REPLACE VIEW most_effective_shots AS
SELECT 
  match_id,
  name,
  total_shots,
  wins,
  losses,
  success_rate,
  percentage_of_total
FROM shot_distribution
WHERE wins >= 3  -- Only consider shots used at least 3 times
ORDER BY success_rate DESC;

-- Most Costly Shots View
CREATE OR REPLACE VIEW most_costly_shots AS
SELECT 
  match_id,
  name,
  total_shots,
  wins,
  losses,
  success_rate,
  percentage_of_total
FROM shot_distribution
WHERE losses >= 3  -- Only consider shots used at least 3 times
ORDER BY success_rate ASC;

-- Hand Analysis View
CREATE OR REPLACE VIEW hand_analysis AS
SELECT 
  m.id AS match_id,
  p.winning_hand AS hand,
  COUNT(*) AS total_shots,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS wins,
  SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS losses,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / COUNT(*), 1) AS success_rate
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
WHERE p.winning_hand IS NOT NULL
GROUP BY m.id, p.winning_hand;

-- Set Breakdown View
CREATE OR REPLACE VIEW set_breakdown AS
SELECT 
  m.id AS match_id,
  s.set_number,
  sh.name AS shot_name,
  COUNT(*) AS total_shots_in_set,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS wins_in_set
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots sh ON sh.id = p.winning_shot_id
GROUP BY m.id, s.set_number, sh.name;

-- Tactical Insights View
CREATE OR REPLACE VIEW tactical_insights AS
SELECT 
  m.id AS match_id,
  w_sh.name AS winning_shot,
  o_sh.name AS opponent_shot,
  COUNT(*) AS total_encounters,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS wins,
  SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS losses,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_percentage
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots w_sh ON w_sh.id = p.winning_shot_id
JOIN shots o_sh ON o_sh.id = p.other_shot_id
GROUP BY m.id, w_sh.name, o_sh.name
HAVING COUNT(*) >= 3  -- Only show matchups that occurred at least 3 times
ORDER BY win_percentage DESC; 