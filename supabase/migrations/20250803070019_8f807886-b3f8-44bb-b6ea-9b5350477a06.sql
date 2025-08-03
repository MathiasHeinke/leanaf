-- Fix remaining Security Definer Views
-- Part 2: Complex views that need proper structure

-- 1. Fix v_meal_totals view
DROP VIEW IF EXISTS public.v_meal_totals;
CREATE VIEW public.v_meal_totals AS
SELECT 
  user_id,
  date AS d,
  COALESCE(SUM(calories), 0) AS kcal,
  COALESCE(SUM(protein), 0) AS protein,
  COALESCE(SUM(carbs), 0) AS carbs,
  COALESCE(SUM(fats), 0) AS fats,
  json_agg(
    json_build_object(
      'id', id,
      'text', text,
      'calories', calories,
      'protein', protein,
      'carbs', carbs,
      'fats', fats,
      'meal_type', meal_type,
      'created_at', created_at
    ) ORDER BY created_at
  ) AS meals
FROM meals
GROUP BY user_id, date;

-- 2. Fix v_workout_totals view - simplified without nested aggregation
DROP VIEW IF EXISTS public.v_workout_totals;
CREATE VIEW public.v_workout_totals AS
SELECT 
  es.user_id,
  es.date AS d,
  COALESCE(SUM(es.weight_kg * es.reps), 0) AS volume_kg,
  json_agg(
    json_build_object(
      'exercise_id', es.exercise_id,
      'exercise_name', ex.name,
      'weight_kg', es.weight_kg,
      'reps', es.reps,
      'rpe', es.rpe,
      'created_at', es.created_at
    ) ORDER BY es.created_at
  ) AS workouts
FROM exercise_sets es
LEFT JOIN exercises ex ON ex.id = es.exercise_id
GROUP BY es.user_id, es.date;

-- 3. Fix v_summary_rolling_30 view
DROP VIEW IF EXISTS public.v_summary_rolling_30;
CREATE VIEW public.v_summary_rolling_30 AS
SELECT 
  ds.user_id,
  ds.date,
  COALESCE(ds.total_calories, 0) AS kcal,
  COALESCE(ds.workout_volume, 0) AS volume_kg,
  COALESCE(st.sleep_hours, 0) AS sleep_hours,
  COALESCE(st.sleep_score, 0) AS sleep_score,
  COALESCE(ft.fluids_ml, 0) AS hydration_ml,
  CASE 
    WHEN ft.fluids_ml >= 2000 THEN 100
    WHEN ft.fluids_ml >= 1500 THEN 75
    WHEN ft.fluids_ml >= 1000 THEN 50
    WHEN ft.fluids_ml >= 500 THEN 25
    ELSE 0
  END AS hydration_score,
  COALESCE(sf.compliance_pct, 0) AS supplement_compliance,
  COALESCE(de.mood, 'neutral') AS mood,
  -- Calculate completeness score based on data availability
  (
    (CASE WHEN ds.total_calories > 0 THEN 0.3 ELSE 0 END) +
    (CASE WHEN ds.workout_volume > 0 THEN 0.2 ELSE 0 END) +
    (CASE WHEN st.sleep_hours > 0 THEN 0.2 ELSE 0 END) +
    (CASE WHEN ft.fluids_ml > 0 THEN 0.15 ELSE 0 END) +
    (CASE WHEN sf.compliance_pct > 0 THEN 0.15 ELSE 0 END)
  ) AS completeness_score
FROM daily_summaries ds
LEFT JOIN sleep_tracking st ON st.user_id = ds.user_id AND st.date = ds.date
LEFT JOIN v_fluids_totals ft ON ft.user_id = ds.user_id AND ft.date = ds.date
LEFT JOIN v_supplement_flags sf ON sf.user_id = ds.user_id AND sf.date = ds.date
LEFT JOIN diary_entries de ON de.user_id = ds.user_id AND de.date = ds.date
WHERE ds.date >= CURRENT_DATE - INTERVAL '30 days';

-- 4. Fix v_missing_summaries view - simplified approach
DROP VIEW IF EXISTS public.v_missing_summaries;
CREATE VIEW public.v_missing_summaries AS
WITH date_range AS (
  SELECT 
    p.id AS user_id,
    d.date_val AS missing_date
  FROM profiles p
  CROSS JOIN (
    SELECT generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '1 day', '1 day')::date AS date_val
  ) d
  WHERE d.date_val >= p.created_at::date
)
SELECT dr.user_id, dr.missing_date
FROM date_range dr
LEFT JOIN daily_summaries ds ON ds.user_id = dr.user_id AND ds.date = dr.missing_date
WHERE ds.id IS NULL;