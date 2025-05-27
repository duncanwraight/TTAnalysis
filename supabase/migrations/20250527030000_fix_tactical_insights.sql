-- Fix tactical insights to remove duplicates and show clearer opponent vs player analysis
-- This shows how well the player performs against specific opponent shots

DROP VIEW IF EXISTS tactical_insights;

CREATE VIEW tactical_insights AS
SELECT 
  m.id AS match_id,
  o_sh.name AS opponent_shot,
  COUNT(*) AS total_encounters,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS wins,
  SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS losses,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_percentage
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots o_sh ON o_sh.id = p.other_shot_id
GROUP BY m.id, o_sh.name
HAVING COUNT(*) >= 3
ORDER BY win_percentage DESC;

-- Grant access to the updated view
ALTER VIEW tactical_insights OWNER TO postgres;
GRANT SELECT ON tactical_insights TO authenticated;
GRANT SELECT ON tactical_insights TO anon;