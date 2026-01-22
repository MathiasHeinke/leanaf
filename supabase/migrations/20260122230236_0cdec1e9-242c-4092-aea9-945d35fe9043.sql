-- Drop and recreate ensure_daily_goals RPC with correct column names
-- The old function returned a different type, so we need to drop it first

DROP FUNCTION IF EXISTS public.ensure_daily_goals(uuid);

CREATE FUNCTION public.ensure_daily_goals(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_goals RECORD;
  user_profile RECORD;
BEGIN
  -- Find goals for TODAY specifically (not just any record)
  SELECT * INTO today_goals
  FROM public.daily_goals 
  WHERE user_id = user_id_param 
    AND goal_date = CURRENT_DATE;

  -- If goals exist for today, return them
  IF today_goals IS NOT NULL THEN
    RETURN row_to_json(today_goals)::jsonb;
  END IF;

  -- Load from CORRECT profile columns
  SELECT 
    daily_calorie_target,
    protein_target_g,
    carbs_target_g,
    fats_target_g,
    fluid_goal_ml,
    steps_goal
  INTO user_profile
  FROM public.profiles 
  WHERE user_id = user_id_param;

  -- Insert into CORRECT daily_goals columns
  INSERT INTO public.daily_goals (
    user_id, 
    goal_date, 
    calories, 
    protein, 
    carbs, 
    fats, 
    fluid_goal_ml,
    steps_goal
  ) VALUES (
    user_id_param,
    CURRENT_DATE,
    COALESCE(user_profile.daily_calorie_target, 2000),
    COALESCE(user_profile.protein_target_g, 150),
    COALESCE(user_profile.carbs_target_g, 250),
    COALESCE(user_profile.fats_target_g, 65),
    COALESCE(user_profile.fluid_goal_ml, 2500),
    COALESCE(user_profile.steps_goal, 10000)
  )
  ON CONFLICT (user_id, goal_date) DO UPDATE SET
    calories = EXCLUDED.calories,
    protein = EXCLUDED.protein,
    carbs = EXCLUDED.carbs,
    fats = EXCLUDED.fats,
    fluid_goal_ml = EXCLUDED.fluid_goal_ml,
    steps_goal = EXCLUDED.steps_goal,
    updated_at = now()
  RETURNING * INTO today_goals;

  RETURN row_to_json(today_goals)::jsonb;
END;
$$;