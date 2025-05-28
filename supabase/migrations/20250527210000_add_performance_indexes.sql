-- Add performance indexes to improve query performance for analytical views
-- Based on analysis of complex views and common query patterns

-- Phase 1: Critical indexes for immediate performance impact

-- Date-based query optimization for match listing and analysis
-- Supports queries that filter by user_id (RLS) and order by date DESC
CREATE INDEX IF NOT EXISTS idx_matches_user_date ON public.matches(user_id, date DESC);

-- Match analysis view optimization
-- Supports the complex CASE WHEN aggregations in analytical views
CREATE INDEX IF NOT EXISTS idx_points_match_winner ON public.points(match_id, winner);

-- Optimizes queries that filter by match, shot, and winner (most analytical views)
CREATE INDEX IF NOT EXISTS idx_points_match_winning_shot ON public.points(match_id, winning_shot_id, winner);
CREATE INDEX IF NOT EXISTS idx_points_match_other_shot ON public.points(match_id, other_shot_id, winner);

-- Phase 2: Hand analysis optimization

-- Partial indexes for hand analysis views (only index non-null hand values)
CREATE INDEX IF NOT EXISTS idx_points_hand_analysis ON public.points(match_id, winner, winning_hand) 
WHERE winning_hand IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_points_other_hand_analysis ON public.points(match_id, winner, other_hand) 
WHERE other_hand IS NOT NULL;

-- Phase 3: Set-specific analysis optimization

-- Supports set breakdown queries and point ordering within sets
CREATE INDEX IF NOT EXISTS idx_points_set_winner ON public.points(set_id, winner);
CREATE INDEX IF NOT EXISTS idx_points_set_point_number ON public.points(set_id, point_number);

-- Phase 4: Display ordering and lookup optimization

-- Optimizes shot selection interfaces and view ordering
CREATE INDEX IF NOT EXISTS idx_shots_category_display ON public.shots(category_id, display_order);
CREATE INDEX IF NOT EXISTS idx_shot_categories_display ON public.shot_categories(display_order);

-- Additional composite indexes for specific view patterns

-- Optimizes the category_breakdown view which joins all tables
CREATE INDEX IF NOT EXISTS idx_points_category_analysis ON public.points(match_id, winning_shot_id, winner);

-- Optimizes the tactical_insights view for shot vs shot analysis
CREATE INDEX IF NOT EXISTS idx_points_tactical ON public.points(match_id, winning_shot_id, other_shot_id, winner);

-- Comment explaining the performance improvements
COMMENT ON INDEX idx_matches_user_date IS 'Optimizes match listing queries with user filtering and date ordering';
COMMENT ON INDEX idx_points_match_winner IS 'Supports complex analytical view aggregations by match and winner';
COMMENT ON INDEX idx_points_match_winning_shot IS 'Optimizes shot analysis views with match, shot, and winner filtering';
COMMENT ON INDEX idx_points_match_other_shot IS 'Optimizes opponent shot analysis in analytical views';
COMMENT ON INDEX idx_points_hand_analysis IS 'Partial index for hand analysis views (winning_hand only)';
COMMENT ON INDEX idx_points_other_hand_analysis IS 'Partial index for hand analysis views (other_hand only)';
COMMENT ON INDEX idx_points_set_winner IS 'Supports set-specific analysis and breakdown views';
COMMENT ON INDEX idx_points_set_point_number IS 'Optimizes point ordering within sets for chronological analysis';
COMMENT ON INDEX idx_shots_category_display IS 'Optimizes shot selection interfaces and category-based ordering';
COMMENT ON INDEX idx_shot_categories_display IS 'Optimizes category ordering in shot selection and analysis';
COMMENT ON INDEX idx_points_category_analysis IS 'Composite index for category breakdown view performance';
COMMENT ON INDEX idx_points_tactical IS 'Optimizes tactical insights view for shot interaction analysis';