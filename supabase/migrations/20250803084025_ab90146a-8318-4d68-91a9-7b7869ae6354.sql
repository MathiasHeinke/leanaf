-- Fix remaining SECURITY DEFINER views
-- These views currently don't show as having SECURITY DEFINER in the query results
-- but the linter still detects them, so we'll recreate them cleanly

-- Drop and recreate v_missing_summaries without SECURITY DEFINER
DROP VIEW IF EXISTS v_missing_summaries CASCADE;
CREATE VIEW v_missing_summaries AS
WITH recent_dates AS (
  SELECT generate_series(
    CURRENT_DATE - interval '7 days', 
    CURRENT_DATE - interval '1 day', 
    interval '1 day'
  )::date AS date
),
active_users AS (
  SELECT DISTINCT user_id 
  FROM meals 
  WHERE created_at >= CURRENT_DATE - interval '30 days'
)
SELECT 
  au.user_id,
  rd.date
FROM active_users au
CROSS JOIN recent_dates rd
LEFT JOIN daily_summaries ds ON au.user_id = ds.user_id AND rd.date = ds.date
WHERE ds.id IS NULL;

-- Drop and recreate v_user_strength_profile without SECURITY DEFINER  
DROP VIEW IF EXISTS v_user_strength_profile CASCADE;
CREATE VIEW v_user_strength_profile AS
WITH user_maxes AS (
  SELECT 
    es.user_id,
    e.name AS exercise_name,
    e.category AS exercise_category,
    MAX(es.weight_kg) AS max_weight,
    AVG(es.weight_kg) AS avg_weight,
    COUNT(*) AS total_sets
  FROM exercise_sets es
  JOIN exercises e ON es.exercise_id = e.id
  WHERE es.weight_kg > 0
  GROUP BY es.user_id, e.name, e.category
)
SELECT 
  user_id,
  exercise_name,
  exercise_category,
  max_weight,
  avg_weight,
  total_sets,
  CASE 
    WHEN max_weight >= 100 THEN 'advanced'
    WHEN max_weight >= 50 THEN 'intermediate'
    ELSE 'beginner'
  END as strength_level
FROM user_maxes;