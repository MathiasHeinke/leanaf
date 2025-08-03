-- Fix Security Definer Views by dropping and recreating without SECURITY DEFINER
-- This addresses all 8 problematic views identified by the linter

-- 1. Drop all existing Security Definer Views
DROP VIEW IF EXISTS public.v_coach_dashboard;
DROP VIEW IF EXISTS public.v_fluids_totals;
DROP VIEW IF EXISTS public.v_meal_totals;
DROP VIEW IF EXISTS public.v_missing_summaries;
DROP VIEW IF EXISTS public.v_summary_rolling_30;
DROP VIEW IF EXISTS public.v_supplement_flags;
DROP VIEW IF EXISTS public.v_workout_totals;

-- 2. Recreate v_meal_totals with RLS-compatible auth.uid() filter
CREATE VIEW public.v_meal_totals AS
SELECT 
  user_id,
  date AS d,
  COALESCE(SUM(calories), 0) AS kcal,
  COALESCE(SUM(protein), 0) AS protein,
  COALESCE(SUM(carbs), 0) AS carbs,
  COALESCE(SUM(fats), 0) AS fats,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', id,
      'food_name', food_name,
      'calories', calories,
      'protein', protein,
      'carbs', carbs,
      'fats', fats,
      'quantity', quantity,
      'created_at', created_at
    )
  ) AS meals
FROM public.meals
WHERE user_id = auth.uid()
GROUP BY user_id, date;

-- 3. Recreate v_fluids_totals with RLS-compatible filter
CREATE VIEW public.v_fluids_totals AS
SELECT 
  user_id,
  date,
  COALESCE(SUM(amount_ml), 0) AS fluids_ml
FROM public.user_fluids
WHERE user_id = auth.uid()
GROUP BY user_id, date;

-- 4. Recreate v_workout_totals with RLS-compatible filter
CREATE VIEW public.v_workout_totals AS
SELECT 
  es.user_id,
  es.date AS d,
  COALESCE(SUM(es.reps * es.weight_kg), 0) AS volume_kg,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'exercise_id', es.exercise_id,
      'reps', es.reps,
      'weight_kg', es.weight_kg,
      'set_number', es.set_number,
      'created_at', es.created_at
    )
  ) AS workouts
FROM public.exercise_sets es
WHERE es.user_id = auth.uid()
GROUP BY es.user_id, es.date;

-- 5. Recreate v_supplement_flags with RLS-compatible filter
CREATE VIEW public.v_supplement_flags AS
SELECT 
  user_id,
  date,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(CASE WHEN taken THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
    ELSE 0
  END AS compliance_pct
FROM public.supplement_intake_log
WHERE user_id = auth.uid()
GROUP BY user_id, date;

-- 6. Recreate v_summary_rolling_30 with RLS-compatible filter
CREATE VIEW public.v_summary_rolling_30 AS
SELECT 
  ds.user_id,
  ds.date,
  ds.total_calories AS kcal,
  ds.workout_volume AS volume_kg,
  st.sleep_hours,
  st.sleep_score,
  ft.fluids_ml AS hydration_ml,
  CASE 
    WHEN ft.fluids_ml >= 2000 THEN 10
    WHEN ft.fluids_ml >= 1500 THEN 7
    WHEN ft.fluids_ml >= 1000 THEN 5
    ELSE 2
  END AS hydration_score,
  sf.compliance_pct AS supplement_compliance,
  de.mood,
  -- Calculate completeness score (0-10)
  CASE 
    WHEN ds.total_calories > 0 
         AND ds.workout_volume > 0 
         AND st.sleep_hours IS NOT NULL 
         AND ft.fluids_ml > 0 
    THEN 10
    WHEN ds.total_calories > 0 AND st.sleep_hours IS NOT NULL THEN 7
    WHEN ds.total_calories > 0 THEN 5
    ELSE 2
  END AS completeness_score
FROM public.daily_summaries ds
LEFT JOIN public.sleep_tracking st ON ds.user_id = st.user_id AND ds.date = st.date
LEFT JOIN public.v_fluids_totals ft ON ds.user_id = ft.user_id AND ds.date = ft.date
LEFT JOIN public.v_supplement_flags sf ON ds.user_id = sf.user_id AND ds.date = sf.date
LEFT JOIN public.diary_entries de ON ds.user_id = de.user_id AND ds.date = de.date
WHERE ds.user_id = auth.uid()
  AND ds.date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY ds.date DESC;

-- 7. Recreate v_coach_dashboard (Admin view - no user filter needed)
CREATE VIEW public.v_coach_dashboard AS
SELECT 
  cc.id AS conversation_id,
  cc.coach_personality AS coach,
  cc.user_id,
  cc.created_at AS started_at,
  cc.updated_at AS last_msg_at,
  COALESCE(user_msg_count.count, 0) AS user_msgs,
  COALESCE(coach_msg_count.count, 0) AS coach_msgs,
  CASE 
    WHEN tool_usage.conversation_id IS NOT NULL THEN true 
    ELSE false 
  END AS used_tool,
  CASE 
    WHEN rag_usage.conversation_id IS NOT NULL THEN true 
    ELSE false 
  END AS used_rag,
  COALESCE(tool_list.tools, ARRAY[]::text[]) AS tool_list,
  acn.admin_status,
  COALESCE(plan_counts.plan_count, 0) AS plan_count
FROM public.coach_conversations cc
LEFT JOIN (
  SELECT conversation_id, COUNT(*) as count
  FROM public.coach_messages 
  WHERE message_role = 'user'
  GROUP BY conversation_id
) user_msg_count ON cc.id = user_msg_count.conversation_id
LEFT JOIN (
  SELECT conversation_id, COUNT(*) as count
  FROM public.coach_messages 
  WHERE message_role = 'assistant'
  GROUP BY conversation_id
) coach_msg_count ON cc.id = coach_msg_count.conversation_id
LEFT JOIN (
  SELECT DISTINCT conversation_id
  FROM public.coach_tool_events
) tool_usage ON cc.id = tool_usage.conversation_id
LEFT JOIN (
  SELECT DISTINCT conversation_id
  FROM public.coach_rag_events
) rag_usage ON cc.id = rag_usage.conversation_id
LEFT JOIN (
  SELECT conversation_id, ARRAY_AGG(DISTINCT tool) as tools
  FROM public.coach_tool_events
  GROUP BY conversation_id
) tool_list ON cc.id = tool_list.conversation_id
LEFT JOIN public.admin_conversation_notes acn ON cc.id = acn.conversation_id
LEFT JOIN (
  SELECT conversation_id, COUNT(*) as plan_count
  FROM public.coach_plans
  GROUP BY conversation_id
) plan_counts ON cc.id = plan_counts.conversation_id
ORDER BY cc.updated_at DESC;

-- 8. Recreate v_missing_summaries (Admin view - no user filter needed)
CREATE VIEW public.v_missing_summaries AS
SELECT DISTINCT
  p.user_id,
  p.email,
  dates.summary_date,
  CASE 
    WHEN ds.id IS NULL THEN 'missing'
    WHEN ds.summary_md IS NULL OR ds.summary_md = '' THEN 'incomplete'
    ELSE 'complete'
  END AS status
FROM public.profiles p
CROSS JOIN (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '1 day',
    INTERVAL '1 day'
  )::date AS summary_date
) dates
LEFT JOIN public.daily_summaries ds ON p.user_id = ds.user_id AND dates.summary_date = ds.date
WHERE p.user_id IN (
  SELECT DISTINCT user_id 
  FROM public.meals 
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
)
ORDER BY p.user_id, dates.summary_date DESC;