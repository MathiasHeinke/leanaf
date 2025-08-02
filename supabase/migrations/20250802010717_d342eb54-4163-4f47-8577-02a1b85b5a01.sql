-- ======================================================================
-- 1. HELPER VIEWS FOR DATA AGGREGATION
-- ======================================================================

-- 1-a: Meal totals per day
CREATE OR REPLACE VIEW v_meal_totals AS
SELECT  
  user_id,
  date_trunc('day', created_at)::date AS d,
  sum(calories) AS kcal,
  sum(protein) AS protein_g,
  sum(carbs) AS carbs_g,
  sum(fats) AS fats_g,
  json_agg(jsonb_build_object(
    'time', to_char(created_at, 'HH24:MI'),
    'text', text,
    'kcal', calories
  ) ORDER BY created_at) AS meals
FROM meals
GROUP BY 1,2;

-- 1-b: Workout totals per day (fixed join)
CREATE OR REPLACE VIEW v_workout_totals AS
SELECT  
  es.user_id,
  es.date AS d,
  sum(sets.reps * sets.weight_kg) AS volume_kg,
  json_agg(jsonb_build_object(
    'session', es.session_name,
    'type', es.workout_type,
    'vol', (sets.reps * sets.weight_kg)
  )) AS workouts
FROM exercise_sessions es
LEFT JOIN exercise_sets sets ON sets.session_id = es.id
GROUP BY 1,2;

-- 1-c: Fluid totals per day
CREATE OR REPLACE VIEW v_fluids_totals AS
SELECT  
  user_id,
  date,
  sum(amount_ml) AS fluids_ml
FROM user_fluids
GROUP BY 1,2;

-- 1-d: Supplement compliance per day
CREATE OR REPLACE VIEW v_supplement_flags AS
SELECT  
  user_id,
  date,
  count(*) FILTER (WHERE taken) * 100.0 / greatest(count(*), 1) AS compliance_pct
FROM supplement_intake_log
GROUP BY 1,2;

-- ======================================================================
-- 2. ADD MISSING COLUMNS TO DAILY_SUMMARIES
-- ======================================================================

-- Add summary_struct_json column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'daily_summaries' 
                 AND column_name = 'summary_struct_json') THEN
    ALTER TABLE daily_summaries ADD COLUMN summary_struct_json JSONB;
  END IF;
END $$;

-- Add hydration_score column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'daily_summaries' 
                 AND column_name = 'hydration_score') THEN
    ALTER TABLE daily_summaries ADD COLUMN hydration_score INTEGER;
  END IF;
END $$;

-- ======================================================================
-- 3. MAIN RPC FUNCTION: GET_DAY_CONTEXT
-- ======================================================================

CREATE OR REPLACE FUNCTION get_day_context(p_user uuid, p_day date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  out_json json;
BEGIN
  SELECT json_build_object(
    'date', p_day,
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE id = p_user),
    'goals', (SELECT row_to_json(dg) FROM daily_goals dg WHERE user_id = p_user),
    'meals', coalesce((SELECT meals FROM v_meal_totals WHERE user_id = p_user AND d = p_day), '[]'::json),
    'totals', (SELECT to_jsonb(v_meal_totals) - '{user_id,d}' 
               FROM v_meal_totals WHERE user_id = p_user AND d = p_day),
    'workouts', coalesce((SELECT workouts FROM v_workout_totals WHERE user_id = p_user AND d = p_day), '[]'::json),
    'workout_totals', (SELECT to_jsonb(v_workout_totals) - '{user_id,d,workouts}'
                       FROM v_workout_totals WHERE user_id = p_user AND d = p_day),
    'sleep', (SELECT row_to_json(s) FROM sleep_tracking s WHERE user_id = p_user AND date = p_day),
    'fluids_ml', (SELECT fluids_ml FROM v_fluids_totals WHERE user_id = p_user AND date = p_day),
    'supplements', (SELECT compliance_pct FROM v_supplement_flags WHERE user_id = p_user AND date = p_day),
    'weight', (SELECT row_to_json(w) FROM weight_history w WHERE user_id = p_user AND date = p_day),
    'quick_workouts', (SELECT json_agg(jsonb_build_object(
      'description', description,
      'steps', steps,
      'distance_km', distance_km
    )) FROM quick_workouts WHERE user_id = p_user AND date = p_day)
  ) INTO out_json;
  
  RETURN coalesce(out_json, '{}'::json);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_day_context(uuid, date) TO anon, authenticated;

-- ======================================================================
-- 4. MISSING SUMMARIES VIEW
-- ======================================================================

CREATE OR REPLACE VIEW v_missing_summaries AS
SELECT d::date AS date, u.id AS user_id
FROM generate_series(current_date - interval '30 days',
                     current_date,
                     interval '1 day') d
CROSS JOIN (SELECT DISTINCT id FROM profiles) u
LEFT JOIN daily_summaries ds
       ON ds.user_id = u.id AND ds.date = d::date
WHERE ds.id IS NULL;