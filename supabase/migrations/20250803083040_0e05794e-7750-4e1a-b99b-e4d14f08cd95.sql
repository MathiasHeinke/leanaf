-- Critical Security Fix: Remove SECURITY DEFINER from all views
-- This addresses the 8 critical security definer view errors

-- First, drop all problematic views
DROP VIEW IF EXISTS v_meal_totals CASCADE;
DROP VIEW IF EXISTS v_workout_totals CASCADE;
DROP VIEW IF EXISTS v_fluids_totals CASCADE;
DROP VIEW IF EXISTS v_supplement_flags CASCADE;
DROP VIEW IF EXISTS v_summary_rolling_30 CASCADE;
DROP VIEW IF EXISTS v_user_stats CASCADE;
DROP VIEW IF EXISTS v_daily_progress CASCADE;
DROP VIEW IF EXISTS v_user_metrics CASCADE;

-- Recreate v_meal_totals without SECURITY DEFINER (using correct column names)
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
      'text', m.text,
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