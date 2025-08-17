-- 1) Fix unique constraint on daily_goals to allow one row per user per day
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'daily_goals_user_id_unique' 
      AND table_name = 'daily_goals' 
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.daily_goals DROP CONSTRAINT daily_goals_user_id_unique;
  END IF;
END$$;

-- Ensure proper uniqueness
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'daily_goals_user_date_unique' 
      AND table_name = 'daily_goals' 
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.daily_goals 
      ADD CONSTRAINT daily_goals_user_date_unique UNIQUE (user_id, goal_date);
  END IF;
END$$;

-- 2) Make ensure_daily_goals robust with UPSERT (conflict-safe) and keep using profile targets if present
CREATE OR REPLACE FUNCTION public.ensure_daily_goals(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  today_goals RECORD;
  user_profile RECORD;
BEGIN
  -- Try to find today's goals
  SELECT * INTO today_goals
  FROM public.daily_goals 
  WHERE user_id = user_id_param 
    AND goal_date = CURRENT_DATE;

  -- If none, create from profile defaults or system defaults using conflict-safe upsert
  IF today_goals IS NULL THEN
    -- Load targets from profile using correct columns
    SELECT 
      daily_calorie_target,
      protein_target_g,
      carbs_target_g,
      fats_target_g
    INTO user_profile
    FROM public.profiles 
    WHERE user_id = user_id_param;

    INSERT INTO public.daily_goals (
      user_id, 
      goal_date, 
      calories, 
      protein, 
      carbs, 
      fats, 
      fluids
    ) VALUES (
      user_id_param,
      CURRENT_DATE,
      COALESCE(user_profile.daily_calorie_target, 2000),
      COALESCE(user_profile.protein_target_g, 150),
      COALESCE(user_profile.carbs_target_g, 250),
      COALESCE(user_profile.fats_target_g, 65),
      2000
    )
    ON CONFLICT (user_id, goal_date) DO UPDATE SET
      calories = EXCLUDED.calories,
      protein  = EXCLUDED.protein,
      carbs    = EXCLUDED.carbs,
      fats     = EXCLUDED.fats,
      fluids   = EXCLUDED.fluids
    RETURNING * INTO today_goals;
  END IF;

  -- Return normalized JSON; include aliases used by frontend
  RETURN jsonb_build_object(
    'id', today_goals.id,
    'user_id', today_goals.user_id,
    'goal_date', today_goals.goal_date,
    'calories', today_goals.calories,
    'protein', today_goals.protein,
    'carbs', today_goals.carbs,
    'fats', today_goals.fats,
    'fluids', today_goals.fluids,
    'fluid_goal_ml', today_goals.fluids,
    'steps_goal', 10000
  );
END;
$$;