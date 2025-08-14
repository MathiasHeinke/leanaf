-- Update v_missing_summaries view to accept timezone parameter
CREATE OR REPLACE VIEW v_missing_summaries_tz AS
SELECT DISTINCT
  user_id,
  d::date as date
FROM (
  -- Get all days that have data for each user in the last 30 days
  SELECT DISTINCT user_id, ts::date as d
  FROM meals
  WHERE ts >= CURRENT_DATE - INTERVAL '30 days'
  
  UNION
  
  SELECT DISTINCT user_id, date as d
  FROM workouts
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  
  UNION
  
  SELECT DISTINCT user_id, date as d
  FROM user_fluids
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  
  UNION
  
  SELECT DISTINCT user_id, created_at::date as d
  FROM exercise_sets
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
) data_days
WHERE NOT EXISTS (
  SELECT 1 
  FROM daily_summaries ds
  WHERE ds.user_id = data_days.user_id 
  AND ds.date = data_days.d
)
ORDER BY user_id, date DESC;

-- Create timezone-aware RPC for getting day context
CREATE OR REPLACE FUNCTION get_day_context_tz(
  p_user UUID,
  p_day DATE,
  p_timezone TEXT DEFAULT 'Europe/Berlin'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB := '{}';
  v_meals JSONB;
  v_workouts JSONB;
  v_sets JSONB;
  v_fluids JSONB;
  v_sleep JSONB;
  v_supplements JSONB;
  v_diary JSONB;
  v_start_ts TIMESTAMPTZ;
  v_end_ts TIMESTAMPTZ;
BEGIN
  -- Calculate day boundaries in user's timezone
  v_start_ts := (p_day::text || ' 00:00:00')::timestamp AT TIME ZONE p_timezone;
  v_end_ts := (p_day::text || ' 23:59:59')::timestamp AT TIME ZONE p_timezone;

  -- Meals within the timezone-adjusted day
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'title', title,
      'calories', calories,
      'protein', protein,
      'carbs', carbs,
      'fat', fat,
      'created_at', ts
    )
  ), '[]'::jsonb) INTO v_meals
  FROM meals
  WHERE user_id = p_user
    AND ts >= v_start_ts
    AND ts <= v_end_ts;

  -- Workouts
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'did_workout', did_workout,
      'duration_minutes', duration_minutes,
      'workout_type', workout_type,
      'notes', notes,
      'steps', steps
    )
  ), '[]'::jsonb) INTO v_workouts
  FROM workouts
  WHERE user_id = p_user AND date = p_day;

  -- Exercise sets
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'exercise_name', e.name,
      'muscle_group', e.primary_muscle_group,
      'weight_kg', es.weight_kg,
      'reps', es.reps,
      'created_at', es.created_at
    )
  ), '[]'::jsonb) INTO v_sets
  FROM exercise_sets es
  LEFT JOIN exercises e ON es.exercise_id = e.id
  WHERE es.user_id = p_user
    AND es.created_at >= v_start_ts
    AND es.created_at <= v_end_ts;

  -- Hydration
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'amount_ml', amount_ml,
      'fluid_type', fluid_type,
      'created_at', created_at
    )
  ), '[]'::jsonb) INTO v_fluids
  FROM user_fluids
  WHERE user_id = p_user AND date = p_day;

  -- Sleep data
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'sleep_score', sleep_score,
      'bedtime', bedtime,
      'wake_time', wake_time,
      'notes', notes
    )
  ), '[]'::jsonb) INTO v_sleep
  FROM sleep_tracking
  WHERE user_id = p_user AND date = p_day;

  -- Supplements
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'supplement_name', supplement_name,
      'amount', amount,
      'unit', unit,
      'taken_at', taken_at
    )
  ), '[]'::jsonb) INTO v_supplements
  FROM supplement_intake_log
  WHERE user_id = p_user AND date = p_day;

  -- Diary entries
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'content', content,
      'mood', mood,
      'entry_type', entry_type,
      'created_at', created_at
    )
  ), '[]'::jsonb) INTO v_diary
  FROM diary_entries
  WHERE user_id = p_user AND date = p_day;

  -- Combine all data
  v_result := jsonb_build_object(
    'date', p_day,
    'timezone', p_timezone,
    'meals', v_meals,
    'workouts', v_workouts,
    'exercise_sets', v_sets,
    'fluids', v_fluids,
    'sleep', v_sleep,
    'supplements', v_supplements,
    'diary_entries', v_diary
  );

  RETURN v_result;
END;
$$;