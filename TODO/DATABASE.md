# TTAnalysis Database Optimization Analysis

## **Critical Performance Issues:**

### **1. N+1 Query Problem in Match Analysis** ⚠️
**Location:** `src/pages/MatchAnalysis.tsx` lines 75-127
```javascript
const [
  matchSummary,
  mostEffectiveShots,
  mostCostlyShots,
  shotDistribution,
  handAnalysis,
  shotHandAnalysis,
  setBreakdown,
  categoryBreakdown,
  tacticalInsights
] = await Promise.all([...9 separate queries])
```
**Impact:** High - Executes 9 separate queries for a single match analysis page

### **2. Inefficient Point Recording Pattern** ⚠️
**Location:** `src/pages/MatchTracker.tsx` lines 214-418
- Multiple sequential database calls per point (get sets, update/create set, create point)
- No batch operations for multiple points
- Separate API calls for set updates and point creation

### **3. Redundant Data Fetching** ⚠️
**Location:** `src/lib/api.ts` lines 44-60
```javascript
const [matchResult, setsResult, pointsResult] = await Promise.all([
  supabase.from('matches').select('*').eq('id', id).single(),
  supabase.from('sets').select('*').eq('match_id', id),
  supabase.from('points').select('*').eq('match_id', id)
]);
```
**Impact:** Loads ALL points for a match, even when only current set needed

### **4. Missing Database Indexes** ⚠️
No indexes on frequently queried columns like `points.winner`, `points.winning_hand`, or `matches.date`.

## **High-Impact Optimization Recommendations:**

### **1. Create Composite Analysis View** 🎯 (Biggest Impact)
Replace 9 separate queries with a single comprehensive view:
```sql
CREATE OR REPLACE VIEW complete_match_analysis AS
SELECT 
  m.id AS match_id,
  m.opponent_name,
  m.date,
  m.match_score,
  -- Match summary data
  COUNT(p.id) AS total_points,
  SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) AS points_won,
  -- Shot distribution aggregates
  json_agg(DISTINCT jsonb_build_object(
    'shot_name', sh.name,
    'total', COUNT(*) OVER (PARTITION BY sh.id),
    'wins', SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) OVER (PARTITION BY sh.id)
  )) AS shot_stats,
  -- Hand analysis aggregates  
  json_agg(DISTINCT jsonb_build_object(
    'hand', p.winning_hand,
    'total', COUNT(*) OVER (PARTITION BY p.winning_hand),
    'wins', SUM(CASE WHEN p.winner = 'player' THEN 1 ELSE 0 END) OVER (PARTITION BY p.winning_hand)
  )) AS hand_stats
FROM matches m
LEFT JOIN sets s ON s.match_id = m.id
LEFT JOIN points p ON p.set_id = s.id
LEFT JOIN shots sh ON sh.id = p.winning_shot_id
GROUP BY m.id, m.opponent_name, m.date, m.match_score;
```

### **2. Add Missing Database Indexes** 🎯
```sql
-- Performance indexes for analysis queries
CREATE INDEX idx_points_winner ON points(winner);
CREATE INDEX idx_points_winning_hand ON points(winning_hand);
CREATE INDEX idx_points_created_at ON points(created_at);
CREATE INDEX idx_sets_set_number ON sets(set_number);
CREATE INDEX idx_matches_date ON matches(date);
CREATE INDEX idx_matches_user_date ON matches(user_id, date);

-- Composite indexes for common query patterns
CREATE INDEX idx_points_match_set ON points(match_id, set_id);
CREATE INDEX idx_points_winner_shot ON points(winner, winning_shot_id);
```

### **3. Implement Data Caching Strategy** 🎯
**Location:** `src/lib/shotsApi.ts`
- Shots and categories data rarely changes - implement localStorage caching
- Cache analysis results for recently viewed matches

### **4. Optimize Point Recording with Batch Operations** 🎯
Create a stored procedure for atomic point recording:
```sql
CREATE OR REPLACE FUNCTION record_point_with_set_update(
  p_match_id UUID,
  p_set_number INTEGER,
  p_point_number INTEGER,
  p_winner VARCHAR(10),
  p_winning_shot_id UUID,
  p_winning_hand VARCHAR(2),
  p_other_shot_id UUID,
  p_other_hand VARCHAR(2)
) RETURNS JSON AS $$
DECLARE
  set_record sets%ROWTYPE;
  point_record points%ROWTYPE;
BEGIN
  -- Get or create set
  SELECT * INTO set_record 
  FROM sets 
  WHERE match_id = p_match_id AND set_number = p_set_number;
  
  IF NOT FOUND THEN
    INSERT INTO sets (match_id, set_number, score, player_score, opponent_score)
    VALUES (p_match_id, p_set_number, '0-0', 0, 0)
    RETURNING * INTO set_record;
  END IF;
  
  -- Update scores
  IF p_winner = 'player' THEN
    UPDATE sets SET 
      player_score = player_score + 1,
      score = (player_score + 1) || '-' || opponent_score
    WHERE id = set_record.id;
  ELSE
    UPDATE sets SET 
      opponent_score = opponent_score + 1,
      score = player_score || '-' || (opponent_score + 1)
    WHERE id = set_record.id;
  END IF;
  
  -- Insert point
  INSERT INTO points (set_id, match_id, point_number, winner, winning_shot_id, winning_hand, other_shot_id, other_hand)
  VALUES (set_record.id, p_match_id, p_point_number, p_winner, p_winning_shot_id, p_winning_hand, p_other_shot_id, p_other_hand)
  RETURNING * INTO point_record;
  
  RETURN json_build_object('set', row_to_json(set_record), 'point', row_to_json(point_record));
END;
$$ LANGUAGE plpgsql;
```

### **5. Implement Pagination for Large Datasets** 🎯
**Location:** `src/pages/MatchList.tsx`
- Add pagination for matches list (currently loads all matches)
- Lazy load match analysis data (load basic info first, detailed analysis on demand)

### **6. Optimize Point History Loading** 🎯
**Location:** `src/components/PointHistory.tsx`
- Only load points for current set instead of all match points
- Add date-based filtering for recent points

## **Implementation Priority:**

### **Immediate (High Impact):**
1. Add missing database indexes
2. Create composite analysis view
3. Implement shot data caching

### **Short Term:**
1. Optimize point recording with stored procedures
2. Add pagination to match lists
3. Optimize point history loading

### **Medium Term:**
1. Implement comprehensive caching strategy
2. Add database connection pooling
3. Create materialized views for heavy analysis queries

## **Expected Performance Gains:**

- **Match Analysis Page:** 80-90% reduction in load time (9 queries → 1 query)
- **Point Recording:** 60-70% faster (3-4 queries → 1 stored procedure call)
- **Match List:** 50-70% faster with pagination
- **Shot Selection:** Near-instant loading with caching

## **Specific Optimizations by Feature:**

### **Match Analysis Optimization**
- Replace 9 individual queries with single view query
- Pre-aggregate statistics at database level
- Cache results for recently viewed matches

### **Live Match Tracking Optimization**
- Atomic point recording with stored procedures
- Reduce database round trips during gameplay
- Optimize set score updates

### **Data Loading Optimization**
- Implement strategic caching for static data (shots, categories)
- Add pagination for large match lists
- Lazy load heavy analysis data

These optimizations will significantly improve the user experience, especially during live match tracking where responsiveness is critical.