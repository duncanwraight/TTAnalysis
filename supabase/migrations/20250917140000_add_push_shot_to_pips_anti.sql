-- Add "Push" shot to the "pips / anti" category
-- This is different from the short_game push - it's a defensive pushing shot with pips rubber
-- Keep the existing push shot in short_game category

DO $$
BEGIN
    -- Check if Push shot already exists in pips / anti category
    IF NOT EXISTS (
        SELECT 1 FROM public.shots s
        JOIN public.shot_categories sc ON s.category_id = sc.id
        WHERE sc.name = 'pips / anti' AND s.name = 'push'
    ) THEN
        INSERT INTO public.shots (
            id,
            category_id,
            name,
            display_name,
            description,
            display_order
        ) VALUES (
            gen_random_uuid(),
            (SELECT id FROM public.shot_categories WHERE name = 'pips / anti' LIMIT 1),
            'push',
            'Push',
            'Defensive pushing shot typically used with pips rubber',
            2
        );
    END IF;
END $$;