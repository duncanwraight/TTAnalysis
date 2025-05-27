-- Add improved shot breakdown view that separates player vs opponent shots
-- This replaces the existing shot_distribution view with more detailed breakdown

CREATE OR REPLACE VIEW player_shot_breakdown AS
SELECT 
  m.id AS match_id,
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

-- Grant access to the new view
ALTER VIEW player_shot_breakdown OWNER TO postgres;
GRANT SELECT ON player_shot_breakdown TO authenticated;
GRANT SELECT ON player_shot_breakdown TO anon;