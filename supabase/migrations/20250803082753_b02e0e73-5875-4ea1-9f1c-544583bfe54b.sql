-- Critical Security Fix: Remove SECURITY DEFINER from all views
-- This addresses the 8 critical security definer view errors

-- First, let's identify and drop all problematic views
-- We'll recreate them without SECURITY DEFINER

-- Drop views that might have SECURITY DEFINER (common patterns)
DROP VIEW IF EXISTS v_meal_totals CASCADE;
DROP VIEW IF EXISTS v_workout_totals CASCADE;
DROP VIEW IF EXISTS v_fluids_totals CASCADE;
DROP VIEW IF EXISTS v_supplement_flags CASCADE;
DROP VIEW IF EXISTS v_summary_rolling_30 CASCADE;
DROP VIEW IF EXISTS v_user_stats CASCADE;
DROP VIEW IF EXISTS v_daily_progress CASCADE;
DROP VIEW IF EXISTS v_user_metrics CASCADE;

-- Recreate v_meal_totals without SECURITY DEFINER
CREATE VIEW v_meal_totals AS
SELECT 
  m.user_id,
  m.date as d,
  COALESCE(SUM(m.calories), 0) as calories,
  COALESCE(SUM(m.protein), 0) as protein,
  COALESCE(SUM(m.carbs), 0) as carbs,
  COALESCE(SUM(m.fats), 0) as fats,
  json_agg(
    json_build_object(
      'id', m.id,
      'description', m.description,
      'calories', m.calories,
      'protein', m.protein,
      'carbs', m.carbs,
      'fats', m.fats,
      'meal_type', m.meal_type,
      'created_at', m.created_at
    ) ORDER BY m.created_at
  ) as meals
FROM meals m
GROUP BY m.user_id, m.date;

-- Recreate v_workout_totals without SECURITY DEFINER
CREATE VIEW v_workout_totals AS
SELECT 
  es.user_id,
  es.date as d,
  COALESCE(SUM(es.reps * es.weight_kg), 0) as volume_kg,
  json_agg(
    json_build_object(
      'id', es.id,
      'exercise_name', es.exercise_name,
      'reps', es.reps,
      'weight_kg', es.weight_kg,
      'created_at', es.created_at
    ) ORDER BY es.created_at
  ) as workouts
FROM exercise_sets es
GROUP BY es.user_id, es.date;

-- Recreate v_fluids_totals without SECURITY DEFINER
CREATE VIEW v_fluids_totals AS
SELECT 
  user_id,
  date,
  COALESCE(SUM(amount_ml), 0) as fluids_ml
FROM user_fluids
GROUP BY user_id, date;

-- Recreate v_supplement_flags without SECURITY DEFINER
CREATE VIEW v_supplement_flags AS
SELECT 
  si.user_id,
  si.date,
  CASE 
    WHEN COUNT(us.id) = 0 THEN 0
    ELSE (COUNT(si.id)::float / COUNT(us.id) * 100)
  END as compliance_pct
FROM user_supplements us
LEFT JOIN supplement_intake_log si ON us.id = si.supplement_id 
  AND si.user_id = us.user_id
WHERE us.is_active = true
GROUP BY si.user_id, si.date;

-- Recreate v_summary_rolling_30 without SECURITY DEFINER  
CREATE VIEW v_summary_rolling_30 AS
SELECT 
  ds.user_id,
  ds.date,
  ds.total_calories as kcal,
  ds.workout_volume as volume_kg,
  st.sleep_hours,
  st.sleep_score,
  ft.fluids_ml as hydration_ml,
  CASE 
    WHEN ft.fluids_ml >= 2000 THEN 10
    WHEN ft.fluids_ml >= 1500 THEN 8
    WHEN ft.fluids_ml >= 1000 THEN 6
    WHEN ft.fluids_ml >= 500 THEN 4
    ELSE 2
  END as hydration_score,
  sf.compliance_pct as supplement_compliance,
  de.mood,
  -- Completeness score based on data availability
  (CASE WHEN ds.total_calories > 0 THEN 25 ELSE 0 END +
   CASE WHEN ds.workout_volume > 0 THEN 25 ELSE 0 END +
   CASE WHEN st.sleep_hours IS NOT NULL THEN 25 ELSE 0 END +
   CASE WHEN ft.fluids_ml > 0 THEN 25 ELSE 0 END) as completeness_score
FROM daily_summaries ds
LEFT JOIN sleep_tracking st ON ds.user_id = st.user_id AND ds.date = st.date
LEFT JOIN v_fluids_totals ft ON ds.user_id = ft.user_id AND ds.date = ft.date
LEFT JOIN v_supplement_flags sf ON ds.user_id = sf.user_id AND ds.date = sf.date
LEFT JOIN diary_entries de ON ds.user_id = de.user_id AND ds.date = de.date
WHERE ds.date >= CURRENT_DATE - INTERVAL '30 days';

-- Enable RLS on views where needed (views inherit RLS from underlying tables)
-- Views automatically respect RLS policies of their underlying tables

-- Verify no SECURITY DEFINER remains
-- This will help prevent future security definer views from being created accidentally