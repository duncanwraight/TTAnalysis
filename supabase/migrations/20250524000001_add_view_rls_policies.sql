-- Add RLS policies for analysis views
-- Views need RLS policies when accessed through Supabase API directly

-- Enable RLS on all analysis views
ALTER VIEW match_summary OWNER TO postgres;
ALTER VIEW shot_distribution OWNER TO postgres;
ALTER VIEW most_effective_shots OWNER TO postgres;
ALTER VIEW most_costly_shots OWNER TO postgres;
ALTER VIEW hand_analysis OWNER TO postgres;
ALTER VIEW set_breakdown OWNER TO postgres;
ALTER VIEW tactical_insights OWNER TO postgres;
ALTER VIEW category_breakdown OWNER TO postgres;

-- Grant access to authenticated users
GRANT SELECT ON match_summary TO authenticated;
GRANT SELECT ON shot_distribution TO authenticated;
GRANT SELECT ON most_effective_shots TO authenticated;
GRANT SELECT ON most_costly_shots TO authenticated;
GRANT SELECT ON hand_analysis TO authenticated;
GRANT SELECT ON set_breakdown TO authenticated;
GRANT SELECT ON tactical_insights TO authenticated;
GRANT SELECT ON category_breakdown TO authenticated;

-- Grant access to anon users as well (for public access if needed)
GRANT SELECT ON match_summary TO anon;
GRANT SELECT ON shot_distribution TO anon;
GRANT SELECT ON most_effective_shots TO anon;
GRANT SELECT ON most_costly_shots TO anon;
GRANT SELECT ON hand_analysis TO anon;
GRANT SELECT ON set_breakdown TO anon;
GRANT SELECT ON tactical_insights TO anon;
GRANT SELECT ON category_breakdown TO anon;