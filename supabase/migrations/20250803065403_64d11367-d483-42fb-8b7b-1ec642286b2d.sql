-- Fix Security Definer Views by removing SECURITY DEFINER property
-- Part 1: Fix simple views first

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

-- 2. Fix v_fluids_totals view
DROP VIEW IF EXISTS public.v_fluids_totals;
CREATE VIEW public.v_fluids_totals AS
SELECT 
  user_id,
  date,
  COALESCE(SUM(amount_ml), 0) AS fluids_ml
FROM user_fluids
GROUP BY user_id, date;

-- 3. Fix v_supplement_flags view
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

-- 4. Fix v_missing_summaries view
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

-- 5. Fix v_user_strength_profile view
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