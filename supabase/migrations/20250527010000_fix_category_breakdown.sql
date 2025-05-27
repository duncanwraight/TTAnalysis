-- Fix category breakdown to properly account for player wins/losses per category
-- This replaces the existing category_breakdown view with correct logic

CREATE OR REPLACE VIEW category_breakdown AS
SELECT 
  m.id AS match_id,
  sc.name AS category,
  -- Total times player used shots from this category
  SUM(CASE WHEN (p.winner = 'player' AND sh_win.category_id = sc.id) OR (p.winner = 'opponent' AND sh_other.category_id = sc.id) THEN 1 ELSE 0 END) AS total_shots,
  -- Wins when player used shots from this category
  SUM(CASE WHEN p.winner = 'player' AND sh_win.category_id = sc.id THEN 1 ELSE 0 END) AS wins,
  -- Losses when player used shots from this category  
  SUM(CASE WHEN p.winner = 'opponent' AND sh_other.category_id = sc.id THEN 1 ELSE 0 END) AS losses,
  -- Success rate when player uses shots from this category
  CASE 
    WHEN SUM(CASE WHEN (p.winner = 'player' AND sh_win.category_id = sc.id) OR (p.winner = 'opponent' AND sh_other.category_id = sc.id) THEN 1 ELSE 0 END) > 0
    THEN ROUND(100.0 * SUM(CASE WHEN p.winner = 'player' AND sh_win.category_id = sc.id THEN 1 ELSE 0 END) / 
                 SUM(CASE WHEN (p.winner = 'player' AND sh_win.category_id = sc.id) OR (p.winner = 'opponent' AND sh_other.category_id = sc.id) THEN 1 ELSE 0 END), 1)
    ELSE 0 
  END AS success_rate
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
JOIN shots sh_win ON sh_win.id = p.winning_shot_id
JOIN shots sh_other ON sh_other.id = p.other_shot_id
JOIN shot_categories sc ON sc.id = sh_win.category_id OR sc.id = sh_other.category_id
GROUP BY m.id, sc.id, sc.name, sc.display_order
HAVING SUM(CASE WHEN (p.winner = 'player' AND sh_win.category_id = sc.id) OR (p.winner = 'opponent' AND sh_other.category_id = sc.id) THEN 1 ELSE 0 END) > 0
ORDER BY sc.display_order;

-- Grant access to the updated view
ALTER VIEW category_breakdown OWNER TO postgres;
GRANT SELECT ON category_breakdown TO authenticated;
GRANT SELECT ON category_breakdown TO anon;