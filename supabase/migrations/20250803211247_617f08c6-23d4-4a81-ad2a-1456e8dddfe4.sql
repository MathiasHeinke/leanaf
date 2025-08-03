-- Security Definer Views Fix - Complete Migration
-- Target: Fix all 8 Security Definer View errors

-- 1. Drop all affected views (order matters due to dependencies)
DROP VIEW IF EXISTS public.v_summary_rolling_30;
DROP VIEW IF EXISTS public.v_coach_dashboard;
DROP VIEW IF EXISTS public.v_missing_summaries;
DROP VIEW IF EXISTS public.v_fluids_totals;
DROP VIEW IF EXISTS public.v_meal_totals;
DROP VIEW IF EXISTS public.v_supplement_flags;
DROP VIEW IF EXISTS public.v_user_strength_profile;
DROP VIEW IF EXISTS public.v_workout_totals;

-- 2. Recreate with SECURITY INVOKER (alphabetical order)

-- v_coach_dashboard (Admin/Coach access needed)
CREATE VIEW public.v_coach_dashboard
WITH (security_invoker = true) AS
SELECT cc.id AS conversation_id,
    cc.coach_personality AS coach,
    cc.user_id,
    cc.created_at AS started_at,
    cc.updated_at AS last_msg_at,
    COALESCE(user_msg_count.count, 0::bigint) AS user_msgs,
    COALESCE(coach_msg_count.count, 0::bigint) AS coach_msgs,
    CASE WHEN tool_usage.conversation_id IS NOT NULL THEN true ELSE false END AS used_tool,
    CASE WHEN rag_usage.conversation_id IS NOT NULL THEN true ELSE false END AS used_rag,
    COALESCE(tool_list.tools, ARRAY[]::text[]) AS tool_list,
    acn.status AS admin_status,
    COALESCE(plan_counts.plan_count, 0::bigint) AS plan_count
FROM coach_conversations cc
LEFT JOIN (SELECT user_id, count(*) AS count FROM chat_history WHERE role = 'user' GROUP BY user_id) user_msg_count ON cc.user_id = user_msg_count.user_id
LEFT JOIN (SELECT user_id, count(*) AS count FROM chat_history WHERE role = 'assistant' GROUP BY user_id) coach_msg_count ON cc.user_id = coach_msg_count.user_id
LEFT JOIN (SELECT DISTINCT conversation_id FROM tool_usage_events) tool_usage ON cc.id::text = tool_usage.conversation_id
LEFT JOIN (SELECT DISTINCT conversation_id FROM rag_chunk_logs) rag_usage ON cc.id::text = rag_usage.conversation_id
LEFT JOIN (SELECT conversation_id, array_agg(DISTINCT tool) AS tools FROM tool_usage_events GROUP BY conversation_id) tool_list ON cc.id::text = tool_list.conversation_id
LEFT JOIN admin_conversation_notes acn ON cc.id = acn.conversation_id
LEFT JOIN (SELECT conversation_id, count(*) AS plan_count FROM coach_plans GROUP BY conversation_id) plan_counts ON cc.id::text = plan_counts.conversation_id
ORDER BY cc.updated_at DESC;

-- v_fluids_totals (User-specific with RLS)
CREATE VIEW public.v_fluids_totals
WITH (security_invoker = true) AS
SELECT user_id,
    date,
    COALESCE(sum(amount_ml), 0::bigint) AS fluids_ml
FROM user_fluids
WHERE user_id = auth.uid()
GROUP BY user_id, date;

-- v_meal_totals (User-specific with RLS)
CREATE VIEW public.v_meal_totals  
WITH (security_invoker = true) AS
SELECT user_id,
    date AS d,
    COALESCE(sum(calories), 0::numeric) AS kcal,
    COALESCE(sum(protein), 0::numeric) AS protein,
    COALESCE(sum(carbs), 0::numeric) AS carbs,
    COALESCE(sum(fats), 0::numeric) AS fats,
    json_agg(json_build_object('id', id, 'text', text, 'calories', calories, 'protein', protein, 'carbs', carbs, 'fats', fats, 'meal_type', meal_type, 'created_at', created_at)) AS meals
FROM meals
WHERE user_id = auth.uid()
GROUP BY user_id, date;

-- v_missing_summaries (Admin view - needs admin check or remove RLS dependency)
CREATE VIEW public.v_missing_summaries
WITH (security_invoker = true) AS
SELECT DISTINCT p.user_id,
    p.email,
    dates.summary_date,
    CASE 
        WHEN ds.id IS NULL THEN 'missing'::text
        WHEN ds.summary_md IS NULL OR ds.summary_md = '' THEN 'incomplete'::text
        ELSE 'complete'::text
    END AS status
FROM profiles p
CROSS JOIN (SELECT generate_series(CURRENT_DATE - '30 days'::interval, CURRENT_DATE - '1 day'::interval, '1 day'::interval)::date AS summary_date) dates
LEFT JOIN daily_summaries ds ON p.user_id = ds.user_id AND dates.summary_date = ds.date
WHERE p.user_id IN (SELECT DISTINCT user_id FROM meals WHERE created_at >= CURRENT_DATE - '30 days'::interval)
ORDER BY p.user_id, dates.summary_date DESC;

-- v_supplement_flags (User-specific with RLS)
CREATE VIEW public.v_supplement_flags
WITH (security_invoker = true) AS
SELECT user_id,
    date,
    CASE 
        WHEN count(*) > 0 THEN round(((count(CASE WHEN taken THEN 1 ELSE NULL END)::numeric / count(*)::numeric) * 100::numeric), 2)
        ELSE 0::numeric
    END AS compliance_pct
FROM supplement_intake_log
WHERE user_id = auth.uid()
GROUP BY user_id, date;

-- v_user_strength_profile (User-specific, needs user filter)
CREATE VIEW public.v_user_strength_profile
WITH (security_invoker = true) AS
WITH user_maxes AS (
    SELECT es.user_id,
        e.name AS exercise_name,
        e.category AS exercise_category,
        max(es.weight_kg) AS max_weight,
        avg(es.weight_kg) AS avg_weight,
        count(*) AS total_sets
    FROM exercise_sets es
    JOIN exercises e ON es.exercise_id = e.id
    WHERE es.weight_kg > 0::numeric
      AND es.user_id = auth.uid()
    GROUP BY es.user_id, e.name, e.category
)
SELECT user_id,
    exercise_name,
    exercise_category,
    max_weight,
    avg_weight,
    total_sets,
    CASE 
        WHEN max_weight >= 100::numeric THEN 'advanced'::text
        WHEN max_weight >= 50::numeric THEN 'intermediate'::text
        ELSE 'beginner'::text
    END AS strength_level
FROM user_maxes;

-- v_workout_totals (User-specific with RLS)
CREATE VIEW public.v_workout_totals
WITH (security_invoker = true) AS
SELECT user_id,
    date AS d,
    COALESCE(sum(reps::numeric * weight_kg), 0::numeric) AS volume_kg,
    json_agg(json_build_object('exercise_id', exercise_id, 'reps', reps, 'weight_kg', weight_kg, 'set_number', set_number, 'created_at', created_at)) AS workouts
FROM exercise_sets
WHERE user_id = auth.uid()
GROUP BY user_id, date;

-- v_summary_rolling_30 (depends on above views, create last)
CREATE VIEW public.v_summary_rolling_30
WITH (security_invoker = true) AS
SELECT ds.user_id,
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
    CASE 
        WHEN ds.total_calories > 0::numeric AND ds.workout_volume > 0::numeric AND st.sleep_hours IS NOT NULL AND ft.fluids_ml > 0 THEN 10
        WHEN ds.total_calories > 0::numeric AND st.sleep_hours IS NOT NULL THEN 7
        WHEN ds.total_calories > 0::numeric THEN 5
        ELSE 2
    END AS completeness_score
FROM daily_summaries ds
LEFT JOIN sleep_tracking st ON ds.user_id = st.user_id AND ds.date = st.date
LEFT JOIN v_fluids_totals ft ON ds.user_id = ft.user_id AND ds.date = ft.date
LEFT JOIN v_supplement_flags sf ON ds.user_id = sf.user_id AND ds.date = sf.date
LEFT JOIN diary_entries de ON ds.user_id = de.user_id AND ds.date = de.date
WHERE ds.user_id = auth.uid()
  AND ds.date >= CURRENT_DATE - '30 days'::interval;