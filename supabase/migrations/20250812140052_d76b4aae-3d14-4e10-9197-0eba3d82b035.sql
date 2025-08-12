
-- Create weekly_summaries table
CREATE TABLE IF NOT EXISTS public.weekly_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL, -- Monday of the week
  week_end DATE NOT NULL,   -- Sunday of the week
  iso_week INTEGER NOT NULL,
  iso_year INTEGER NOT NULL,
  
  -- Nutrition totals and averages
  total_calories NUMERIC DEFAULT 0,
  total_protein NUMERIC DEFAULT 0,
  total_carbs NUMERIC DEFAULT 0,
  total_fats NUMERIC DEFAULT 0,
  avg_calories_per_day NUMERIC DEFAULT 0,
  avg_protein_per_day NUMERIC DEFAULT 0,
  avg_carbs_per_day NUMERIC DEFAULT 0,
  avg_fats_per_day NUMERIC DEFAULT 0,
  
  -- Training metrics
  workout_volume_total NUMERIC DEFAULT 0,
  workout_volume_avg NUMERIC DEFAULT 0,
  workouts_count INTEGER DEFAULT 0,
  rest_days INTEGER DEFAULT 0,
  
  -- Steps
  steps_total INTEGER DEFAULT 0,
  steps_avg INTEGER DEFAULT 0,
  
  -- Hydration
  hydration_total_ml NUMERIC DEFAULT 0,
  hydration_avg_ml NUMERIC DEFAULT 0,
  hydration_avg_score NUMERIC DEFAULT 0,
  
  -- Sleep
  sleep_avg_score NUMERIC DEFAULT 0,
  
  -- Supplements and inputs
  supplements_count INTEGER DEFAULT 0,
  inputs_count INTEGER DEFAULT 0,
  inputs_avg_per_day NUMERIC DEFAULT 0,
  
  -- Compliance metrics
  compliance_metrics JSONB DEFAULT '{}',
  
  -- Complete structured data
  summary_struct_json JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint per user/week
  UNIQUE(user_id, iso_year, iso_week)
);

-- Enable RLS for weekly_summaries
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_summaries
CREATE POLICY "Users can view their own weekly summaries" 
  ON public.weekly_summaries 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weekly summaries" 
  ON public.weekly_summaries 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly summaries" 
  ON public.weekly_summaries 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view weekly summaries for coaching" 
  ON public.weekly_summaries 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM coach_conversations 
      WHERE coach_conversations.user_id = weekly_summaries.user_id
    ) OR 
    ((current_setting('request.jwt.claims', true))::jsonb ->> 'role') = 'service_role'
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user_id ON public.weekly_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week_start ON public.weekly_summaries(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user_week ON public.weekly_summaries(user_id, week_start);

-- Add updated_at trigger
CREATE TRIGGER update_weekly_summaries_updated_at
  BEFORE UPDATE ON public.weekly_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add new columns to monthly_summaries table
ALTER TABLE public.monthly_summaries 
ADD COLUMN IF NOT EXISTS steps_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS steps_avg INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS workouts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rest_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sleep_avg_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS hydration_avg_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplements_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS inputs_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS inputs_avg_per_day NUMERIC DEFAULT 0;

-- Create compute_weekly_summary function
CREATE OR REPLACE FUNCTION public.compute_weekly_summary(p_user_id UUID, p_week_start DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB := '{}';
  v_week_end DATE;
  v_iso_week INTEGER;
  v_iso_year INTEGER;
  v_nutrition_totals RECORD;
  v_workout_totals RECORD;
  v_hydration_totals RECORD;
  v_sleep_totals RECORD;
  v_steps_totals RECORD;
  v_inputs_totals RECORD;
  v_supplements_count INTEGER := 0;
  v_compliance_metrics JSONB;
  v_summary_data JSONB;
BEGIN
  -- Calculate week boundaries (Monday to Sunday)
  v_week_end := p_week_start + INTERVAL '6 days';
  v_iso_week := EXTRACT(week FROM p_week_start);
  v_iso_year := EXTRACT(isoyear FROM p_week_start);

  -- Aggregate nutrition data from daily_summaries
  SELECT 
    COALESCE(SUM(total_calories), 0) as total_calories,
    COALESCE(SUM(total_protein), 0) as total_protein,
    COALESCE(SUM(total_carbs), 0) as total_carbs,
    COALESCE(SUM(total_fats), 0) as total_fats,
    COUNT(*) FILTER (WHERE total_calories > 0) as tracked_days,
    COALESCE(AVG(total_calories), 0) as avg_calories,
    COALESCE(AVG(total_protein), 0) as avg_protein,
    COALESCE(AVG(total_carbs), 0) as avg_carbs,
    COALESCE(AVG(total_fats), 0) as avg_fats
  INTO v_nutrition_totals
  FROM daily_summaries
  WHERE user_id = p_user_id
    AND date >= p_week_start
    AND date <= v_week_end;

  -- Aggregate workout data
  SELECT 
    COALESCE(SUM(workout_volume), 0) as total_volume,
    COALESCE(AVG(workout_volume), 0) as avg_volume,
    COUNT(*) FILTER (WHERE workout_volume > 0) as workout_days_ds
  INTO v_workout_totals
  FROM daily_summaries
  WHERE user_id = p_user_id
    AND date >= p_week_start
    AND date <= v_week_end;

  -- Get additional workout data from workouts table
  WITH workout_data AS (
    SELECT 
      COUNT(*) FILTER (WHERE did_workout = true OR steps > 0) as workout_days_w,
      COALESCE(SUM(steps), 0) as total_steps,
      COALESCE(AVG(steps), 0) as avg_steps
    FROM workouts
    WHERE user_id = p_user_id
      AND date >= p_week_start
      AND date <= v_week_end
  )
  SELECT 
    total_steps,
    avg_steps,
    workout_days_w
  INTO v_steps_totals
  FROM workout_data;

  -- Combine workout days from both sources
  v_workout_totals.workout_days := GREATEST(v_workout_totals.workout_days_ds, v_steps_totals.workout_days_w);

  -- Aggregate hydration data
  SELECT 
    COALESCE(SUM(amount_ml), 0) as total_ml,
    COALESCE(AVG(amount_ml), 0) as avg_ml,
    COUNT(DISTINCT date) as tracked_days
  INTO v_hydration_totals
  FROM user_fluids
  WHERE user_id = p_user_id
    AND date >= p_week_start
    AND date <= v_week_end;

  -- Get hydration score from daily_summaries
  SELECT 
    COALESCE(AVG(hydration_score), 0) as avg_hydration_score
  INTO v_hydration_totals.avg_score
  FROM daily_summaries
  WHERE user_id = p_user_id
    AND date >= p_week_start
    AND date <= v_week_end
    AND hydration_score IS NOT NULL;

  -- Aggregate sleep data
  SELECT 
    COALESCE(AVG(sleep_score), 0) as avg_score,
    COUNT(*) FILTER (WHERE sleep_score IS NOT NULL) as tracked_days
  INTO v_sleep_totals
  FROM daily_summaries
  WHERE user_id = p_user_id
    AND date >= p_week_start
    AND date <= v_week_end;

  -- Count inputs from various tables
  WITH input_counts AS (
    SELECT 
      (SELECT COUNT(*) FROM meals WHERE user_id = p_user_id AND date >= p_week_start AND date <= v_week_end) as meals_count,
      (SELECT COUNT(*) FROM user_fluids WHERE user_id = p_user_id AND date >= p_week_start AND date <= v_week_end) as fluids_count,
      (SELECT COUNT(*) FROM workouts WHERE user_id = p_user_id AND date >= p_week_start AND date <= v_week_end) as workouts_count,
      (SELECT COALESCE(COUNT(*), 0) FROM user_supplements WHERE user_id = p_user_id AND taken_at::date >= p_week_start AND taken_at::date <= v_week_end) as supplements_count
  )
  SELECT 
    meals_count + fluids_count + workouts_count + supplements_count as total_inputs,
    supplements_count
  INTO v_inputs_totals.total_count, v_supplements_count
  FROM input_counts;

  -- Calculate compliance metrics
  v_compliance_metrics := jsonb_build_object(
    'nutrition_tracked_days', v_nutrition_totals.tracked_days,
    'nutrition_compliance_pct', ROUND((v_nutrition_totals.tracked_days::numeric / 7 * 100), 1),
    'workout_days', v_workout_totals.workout_days,
    'workout_compliance_pct', ROUND((v_workout_totals.workout_days::numeric / 7 * 100), 1),
    'hydration_tracked_days', v_hydration_totals.tracked_days,
    'hydration_compliance_pct', ROUND((v_hydration_totals.tracked_days::numeric / 7 * 100), 1),
    'sleep_tracked_days', v_sleep_totals.tracked_days,
    'sleep_compliance_pct', ROUND((v_sleep_totals.tracked_days::numeric / 7 * 100), 1)
  );

  -- Build complete summary
  v_summary_data := jsonb_build_object(
    'period', jsonb_build_object(
      'week_start', p_week_start,
      'week_end', v_week_end,
      'iso_week', v_iso_week,
      'iso_year', v_iso_year,
      'days', 7
    ),
    'nutrition', jsonb_build_object(
      'total_calories', v_nutrition_totals.total_calories,
      'total_protein', v_nutrition_totals.total_protein,
      'total_carbs', v_nutrition_totals.total_carbs,
      'total_fats', v_nutrition_totals.total_fats,
      'avg_calories', ROUND(v_nutrition_totals.avg_calories, 1),
      'avg_protein', ROUND(v_nutrition_totals.avg_protein, 1),
      'avg_carbs', ROUND(v_nutrition_totals.avg_carbs, 1),
      'avg_fats', ROUND(v_nutrition_totals.avg_fats, 1)
    ),
    'training', jsonb_build_object(
      'total_volume_kg', v_workout_totals.total_volume,
      'avg_volume_kg', ROUND(v_workout_totals.avg_volume, 1),
      'workout_days', v_workout_totals.workout_days,
      'rest_days', 7 - v_workout_totals.workout_days
    ),
    'steps', jsonb_build_object(
      'total', v_steps_totals.total_steps,
      'avg', ROUND(v_steps_totals.avg_steps, 0)
    ),
    'hydration', jsonb_build_object(
      'total_ml', v_hydration_totals.total_ml,
      'avg_ml', ROUND(v_hydration_totals.avg_ml, 0),
      'avg_score', ROUND(v_hydration_totals.avg_score, 1),
      'tracked_days', v_hydration_totals.tracked_days
    ),
    'sleep', jsonb_build_object(
      'avg_score', ROUND(v_sleep_totals.avg_score, 1),
      'tracked_days', v_sleep_totals.tracked_days
    ),
    'inputs', jsonb_build_object(
      'total_count', v_inputs_totals.total_count,
      'avg_per_day', ROUND(v_inputs_totals.total_count::numeric / 7, 1),
      'supplements_count', v_supplements_count
    ),
    'compliance', v_compliance_metrics,
    'generated_at', now()
  );

  -- Upsert into weekly_summaries table
  INSERT INTO public.weekly_summaries (
    user_id, week_start, week_end, iso_week, iso_year,
    total_calories, total_protein, total_carbs, total_fats,
    avg_calories_per_day, avg_protein_per_day, avg_carbs_per_day, avg_fats_per_day,
    workout_volume_total, workout_volume_avg, workouts_count, rest_days,
    steps_total, steps_avg,
    hydration_total_ml, hydration_avg_ml, hydration_avg_score,
    sleep_avg_score, supplements_count, inputs_count, inputs_avg_per_day,
    compliance_metrics, summary_struct_json
  ) VALUES (
    p_user_id, p_week_start, v_week_end, v_iso_week, v_iso_year,
    v_nutrition_totals.total_calories, v_nutrition_totals.total_protein, 
    v_nutrition_totals.total_carbs, v_nutrition_totals.total_fats,
    v_nutrition_totals.avg_calories, v_nutrition_totals.avg_protein,
    v_nutrition_totals.avg_carbs, v_nutrition_totals.avg_fats,
    v_workout_totals.total_volume, v_workout_totals.avg_volume,
    v_workout_totals.workout_days, 7 - v_workout_totals.workout_days,
    v_steps_totals.total_steps, ROUND(v_steps_totals.avg_steps, 0),
    v_hydration_totals.total_ml, ROUND(v_hydration_totals.avg_ml, 0), 
    ROUND(v_hydration_totals.avg_score, 1),
    ROUND(v_sleep_totals.avg_score, 1), v_supplements_count, 
    v_inputs_totals.total_count, ROUND(v_inputs_totals.total_count::numeric / 7, 1),
    v_compliance_metrics, v_summary_data
  )
  ON CONFLICT (user_id, iso_year, iso_week) 
  DO UPDATE SET
    week_end = EXCLUDED.week_end,
    total_calories = EXCLUDED.total_calories,
    total_protein = EXCLUDED.total_protein,
    total_carbs = EXCLUDED.total_carbs,
    total_fats = EXCLUDED.total_fats,
    avg_calories_per_day = EXCLUDED.avg_calories_per_day,
    avg_protein_per_day = EXCLUDED.avg_protein_per_day,
    avg_carbs_per_day = EXCLUDED.avg_carbs_per_day,
    avg_fats_per_day = EXCLUDED.avg_fats_per_day,
    workout_volume_total = EXCLUDED.workout_volume_total,
    workout_volume_avg = EXCLUDED.workout_volume_avg,
    workouts_count = EXCLUDED.workouts_count,
    rest_days = EXCLUDED.rest_days,
    steps_total = EXCLUDED.steps_total,
    steps_avg = EXCLUDED.steps_avg,
    hydration_total_ml = EXCLUDED.hydration_total_ml,
    hydration_avg_ml = EXCLUDED.hydration_avg_ml,
    hydration_avg_score = EXCLUDED.hydration_avg_score,
    sleep_avg_score = EXCLUDED.sleep_avg_score,
    supplements_count = EXCLUDED.supplements_count,
    inputs_count = EXCLUDED.inputs_count,
    inputs_avg_per_day = EXCLUDED.inputs_avg_per_day,
    compliance_metrics = EXCLUDED.compliance_metrics,
    summary_struct_json = EXCLUDED.summary_struct_json,
    updated_at = now();

  RETURN v_summary_data;
END;
$function$;
