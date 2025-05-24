-- Add category breakdown view for match analysis

CREATE OR REPLACE VIEW category_breakdown AS
SELECT 
  m.id AS match_id,
  sc.name AS category,
  COUNT(*) AS total_shots,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS wins,
  SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS losses,
  ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) / COUNT(*), 1) AS success_rate
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots sh ON sh.id = p.winning_shot_id
JOIN shot_categories sc ON sc.id = sh.category_id
GROUP BY m.id, sc.name, sc.display_order
ORDER BY sc.display_order;