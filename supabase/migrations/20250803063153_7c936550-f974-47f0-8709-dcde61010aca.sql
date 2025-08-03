-- Fix Security Definer Views by removing SECURITY DEFINER property
-- These views should use the permissions of the querying user, not the creator

-- 1. Fix rolling_daily_snapshot view
DROP VIEW IF EXISTS public.rolling_daily_snapshot;
CREATE VIEW public.rolling_daily_snapshot AS
SELECT * FROM (
  SELECT DISTINCT ON (user_id, date) 
    user_id,
    date,
    total_calories,
    total_protein,
    total_carbs,
    total_fats,
    workout_volume,
    sleep_score,
    hydration_score,
    created_at
  FROM daily_summaries
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY user_id, date, created_at DESC
);

-- 2. Fix v_meal_totals view - using correct field names
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

-- 3. Fix v_fluids_totals view
DROP VIEW IF EXISTS public.v_fluids_totals;
CREATE VIEW public.v_fluids_totals AS
SELECT 
  user_id,
  date,
  COALESCE(SUM(amount_ml), 0) AS fluids_ml
FROM user_fluids
GROUP BY user_id, date;

-- 4. Fix v_supplement_flags view - using correct table structure
DROP VIEW IF EXISTS public.v_supplement_flags;
CREATE VIEW public.v_supplement_flags AS
SELECT 
  sil.user_id,
  sil.date,
  ROUND(
    (COUNT(CASE WHEN sil.taken = true THEN 1 END)::numeric / 
     NULLIF(COUNT(sil.id), 0)) * 100, 0
  ) AS compliance_pct
FROM supplement_intake_log sil
GROUP BY sil.user_id, sil.date;

-- 5. Fix v_summary_rolling_30 view
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

-- 6. Fix v_workout_totals view  
DROP VIEW IF EXISTS public.v_workout_totals;
CREATE VIEW public.v_workout_totals AS
SELECT 
  es.user_id,
  es.date AS d,
  COALESCE(SUM(es.weight_kg * es.reps), 0) AS volume_kg,
  json_agg(
    json_build_object(
      'session_id', sess.id,
      'session_name', sess.session_name,
      'exercise_name', ex.name,
      'sets_count', COUNT(*),
      'total_volume', SUM(es.weight_kg * es.reps),
      'avg_rpe', AVG(es.rpe)
    )
  ) AS workouts
FROM exercise_sets es
LEFT JOIN exercise_sessions sess ON sess.id = es.session_id
LEFT JOIN exercises ex ON ex.id = es.exercise_id
GROUP BY es.user_id, es.date;

-- 7. Fix v_missing_summaries view
DROP VIEW IF EXISTS public.v_missing_summaries;
CREATE VIEW public.v_missing_summaries AS
SELECT DISTINCT
  p.id AS user_id,
  generate_series(
    GREATEST(p.created_at::date, CURRENT_DATE - INTERVAL '30 days'), 
    CURRENT_DATE - INTERVAL '1 day', 
    '1 day'::interval
  )::date AS missing_date
FROM profiles p
LEFT JOIN daily_summaries ds ON ds.user_id = p.id 
  AND ds.date = generate_series(
    GREATEST(p.created_at::date, CURRENT_DATE - INTERVAL '30 days'), 
    CURRENT_DATE - INTERVAL '1 day', 
    '1 day'::interval
  )::date
WHERE ds.id IS NULL;

-- 8. Fix v_user_strength_profile view
DROP VIEW IF EXISTS public.v_user_strength_profile;
CREATE VIEW public.v_user_strength_profile AS
SELECT 
  es.user_id,
  ex.name AS exercise_name,
  ex.category,
  MAX(es.weight_kg) AS max_weight,
  AVG(es.weight_kg) AS avg_weight,
  COUNT(*) AS total_sets,
  MAX(es.created_at) AS last_performed
FROM exercise_sets es
JOIN exercises ex ON ex.id = es.exercise_id
WHERE es.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY es.user_id, ex.name, ex.category;