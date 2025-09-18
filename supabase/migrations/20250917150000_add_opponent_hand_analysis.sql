-- Add opponent hand analysis view
-- This tracks opponent's hand performance from their winning shots and losing shots

CREATE OR REPLACE VIEW public.opponent_hand_analysis AS
SELECT
    m.id AS match_id,
    CASE
        -- When opponent wins, use their winning_hand
        WHEN p.winner = 'opponent' THEN p.winning_hand
        -- When player wins, use the opponent's other_hand
        WHEN p.winner = 'player' THEN p.other_hand
    END AS hand,
    COUNT(*) AS total_shots,
    SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS losses,
    ROUND(
        100.0 * SUM(CASE WHEN p.winner = 'opponent' THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric,
        1
    ) AS success_rate
FROM matches m
JOIN sets s ON s.match_id = m.id
JOIN points p ON p.set_id = s.id
WHERE
    -- Only include points where we have opponent hand data
    (
        (p.winner = 'opponent' AND p.winning_hand IS NOT NULL) OR
        (p.winner = 'player' AND p.other_hand IS NOT NULL)
    )
    -- Exclude serves to match the existing hand_analysis logic
    AND NOT EXISTS (
        SELECT 1 FROM shots sh
        WHERE sh.id = CASE
            WHEN p.winner = 'opponent' THEN p.winning_shot_id
            ELSE p.other_shot_id
        END
        AND sh.name IN ('serve', 'service_fault')
    )
GROUP BY m.id,
    CASE
        WHEN p.winner = 'opponent' THEN p.winning_hand
        WHEN p.winner = 'player' THEN p.other_hand
    END
HAVING
    CASE
        WHEN p.winner = 'opponent' THEN p.winning_hand
        WHEN p.winner = 'player' THEN p.other_hand
    END IS NOT NULL;