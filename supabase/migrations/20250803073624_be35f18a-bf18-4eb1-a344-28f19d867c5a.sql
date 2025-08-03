-- Critical Security Fix: Remove SECURITY DEFINER from all views (Fixed Dependencies)
-- This migration fixes the 8 SECURITY DEFINER views identified by the linter

-- Drop all views in dependency order first
DROP VIEW IF EXISTS public.rolling_daily_snapshot CASCADE;
DROP VIEW IF EXISTS public.v_summary_rolling_30 CASCADE;
DROP VIEW IF EXISTS public.v_meal_totals CASCADE;
DROP VIEW IF EXISTS public.v_workout_totals CASCADE;
DROP VIEW IF EXISTS public.v_fluids_totals CASCADE;
DROP VIEW IF EXISTS public.v_supplement_flags CASCADE;
DROP VIEW IF EXISTS public.v_missing_summaries CASCADE;
DROP VIEW IF EXISTS public.v_user_strength_profile CASCADE;

-- 1. Recreate v_fluids_totals first (no dependencies)
CREATE VIEW public.v_fluids_totals AS
SELECT 
  user_id,
  date,
  COALESCE(SUM(amount_ml), 0) AS fluids_ml
FROM user_fluids
GROUP BY user_id, date;

-- 2. Recreate v_supplement_flags (no dependencies)
CREATE VIEW public.v_supplement_flags AS
SELECT 
  user_id,
  date,
  CASE 
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND((COUNT(CASE WHEN taken = true THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2)
  END AS compliance_pct
FROM supplement_intake_log
GROUP BY user_id, date;

-- 3. Recreate v_meal_totals (no dependencies)
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
    )
    ORDER BY created_at
  ) FILTER (WHERE id IS NOT NULL) AS meals
FROM meals
GROUP BY user_id, date;

-- 4. Recreate v_workout_totals (no dependencies)
CREATE VIEW public.v_workout_totals AS
SELECT 
  user_id,
  date AS d,
  COALESCE(SUM(CASE WHEN did_workout THEN duration_minutes * intensity ELSE 0 END), 0) AS volume_kg,
  json_agg(
    json_build_object(
      'id', id,
      'workout_type', workout_type,
      'duration_minutes', duration_minutes,
      'intensity', intensity,
      'did_workout', did_workout,
      'created_at', created_at
    )
    ORDER BY created_at
  ) FILTER (WHERE id IS NOT NULL) AS workouts
FROM workouts
GROUP BY user_id, date;

-- 5. Recreate v_summary_rolling_30 (depends on above views)
CREATE VIEW public.v_summary_rolling_30 AS
WITH daily_data AS (
  SELECT 
    user_id,
    date,
    COALESCE((SELECT kcal FROM v_meal_totals mt WHERE mt.user_id = d.user_id AND mt.d = d.date), 0) AS kcal,
    COALESCE((SELECT volume_kg FROM v_workout_totals wt WHERE wt.user_id = d.user_id AND wt.d = d.date), 0) AS volume_kg,
    COALESCE((SELECT sleep_hours FROM sleep_tracking st WHERE st.user_id = d.user_id AND st.date = d.date), 0) AS sleep_hours,
    COALESCE((SELECT sleep_score FROM sleep_tracking st WHERE st.user_id = d.user_id AND st.date = d.date), 0) AS sleep_score,
    COALESCE((SELECT fluids_ml FROM v_fluids_totals ft WHERE ft.user_id = d.user_id AND ft.date = d.date), 0) AS hydration_ml,
    CASE 
      WHEN COALESCE((SELECT fluids_ml FROM v_fluids_totals ft WHERE ft.user_id = d.user_id AND ft.date = d.date), 0) >= 2000 THEN 10
      WHEN COALESCE((SELECT fluids_ml FROM v_fluids_totals ft WHERE ft.user_id = d.user_id AND ft.date = d.date), 0) >= 1500 THEN 8
      WHEN COALESCE((SELECT fluids_ml FROM v_fluids_totals ft WHERE ft.user_id = d.user_id AND ft.date = d.date), 0) >= 1000 THEN 6
      ELSE 3
    END AS hydration_score,
    COALESCE((SELECT compliance_pct FROM v_supplement_flags sf WHERE sf.user_id = d.user_id AND sf.date = d.date), 0) AS supplement_compliance,
    'neutral' AS mood,
    (CASE WHEN EXISTS(SELECT 1 FROM meals m WHERE m.user_id = d.user_id AND m.date = d.date) THEN 25 ELSE 0 END +
     CASE WHEN EXISTS(SELECT 1 FROM workouts w WHERE w.user_id = d.user_id AND w.date = d.date) THEN 25 ELSE 0 END +
     CASE WHEN EXISTS(SELECT 1 FROM sleep_tracking st WHERE st.user_id = d.user_id AND st.date = d.date) THEN 25 ELSE 0 END +
     CASE WHEN EXISTS(SELECT 1 FROM user_fluids uf WHERE uf.user_id = d.user_id AND uf.date = d.date) THEN 25 ELSE 0 END) AS completeness_score
  FROM (
    SELECT DISTINCT user_id, generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, INTERVAL '1 day')::date AS date
    FROM meals
    UNION
    SELECT DISTINCT user_id, generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, INTERVAL '1 day')::date AS date
    FROM workouts
    UNION
    SELECT DISTINCT user_id, generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, INTERVAL '1 day')::date AS date
    FROM sleep_tracking
  ) d
)
SELECT * FROM daily_data
ORDER BY user_id, date DESC;

-- 6. Recreate rolling_daily_snapshot (depends on v_summary_rolling_30)
CREATE VIEW public.rolling_daily_snapshot AS
SELECT 
  user_id,
  date,
  kcal,
  volume_kg,
  sleep_hours,
  sleep_score,
  hydration_ml,
  hydration_score,
  supplement_compliance,
  mood,
  completeness_score
FROM v_summary_rolling_30
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY user_id, date DESC;

-- 7. Recreate v_missing_summaries (independent)
CREATE VIEW public.v_missing_summaries AS
WITH recent_dates AS (
  SELECT generate_series(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '1 day', INTERVAL '1 day')::date AS date
),
active_users AS (
  SELECT DISTINCT user_id
  FROM meals
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  UNION
  SELECT DISTINCT user_id
  FROM workouts
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
),
user_dates AS (
  SELECT au.user_id, rd.date
  FROM active_users au
  CROSS JOIN recent_dates rd
)
SELECT ud.user_id, ud.date
FROM user_dates ud
LEFT JOIN daily_summaries ds ON ds.user_id = ud.user_id AND ds.date = ud.date
WHERE ds.id IS NULL
ORDER BY ud.date DESC, ud.user_id;

-- 8. Recreate v_user_strength_profile (independent)
CREATE VIEW public.v_user_strength_profile AS
WITH user_maxes AS (
  SELECT 
    es.user_id,
    e.name AS exercise_name,
    e.category AS exercise_category,
    MAX(es.weight_kg) AS max_weight,
    AVG(es.weight_kg) AS avg_weight,
    COUNT(*) AS total_sets,
    MAX(es.created_at) AS last_performed
  FROM exercise_sets es
  JOIN exercises e ON e.id = es.exercise_id
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
  last_performed,
  CASE 
    WHEN exercise_category = 'compound' AND max_weight >= 100 THEN 'advanced'
    WHEN exercise_category = 'compound' AND max_weight >= 60 THEN 'intermediate'
    WHEN exercise_category = 'compound' AND max_weight >= 40 THEN 'beginner'
    WHEN exercise_category = 'isolation' AND max_weight >= 30 THEN 'advanced'
    WHEN exercise_category = 'isolation' AND max_weight >= 20 THEN 'intermediate'
    ELSE 'beginner'
  END AS strength_level
FROM user_maxes
ORDER BY user_id, exercise_category, max_weight DESC;