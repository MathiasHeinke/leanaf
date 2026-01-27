-- First drop the existing function, then recreate with fixed logic
DROP FUNCTION IF EXISTS public.ensure_daily_goals(uuid);

-- Recreate ensure_daily_goals to PRESERVE existing fluid_goal_ml
CREATE OR REPLACE FUNCTION public.ensure_daily_goals(user_id_param UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  user_profile RECORD;
  existing_fluid_goal INTEGER;
  calculated_calories INTEGER;
  calculated_protein INTEGER;
  calculated_carbs INTEGER;
  calculated_fats INTEGER;
  calculated_deficit INTEGER;
  final_fluid_goal INTEGER;
BEGIN
  -- Determine target user
  target_user_id := COALESCE(user_id_param, auth.uid());
  
  IF target_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get user profile data
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = target_user_id;
  
  -- CRITICAL: Get existing fluid_goal_ml to preserve it
  SELECT fluid_goal_ml INTO existing_fluid_goal
  FROM daily_goals
  WHERE user_id = target_user_id
  ORDER BY updated_at DESC
  LIMIT 1;
  
  -- Preserve existing fluid_goal_ml, only default to 2500 if NO previous goal exists
  final_fluid_goal := COALESCE(existing_fluid_goal, 2500);
  
  -- Calculate macros based on profile if available
  IF user_profile IS NOT NULL AND user_profile.weight IS NOT NULL THEN
    -- Calculate protein (2g per kg bodyweight for athletes)
    calculated_protein := ROUND(user_profile.weight * 2);
    
    -- Get deficit from calorie_deficit field or default to 500
    calculated_deficit := COALESCE(user_profile.calorie_deficit, 500);
    
    -- Calculate TDEE-based calories if activity_level exists
    IF user_profile.activity_level IS NOT NULL THEN
      -- Simple TDEE calculation
      calculated_calories := ROUND(
        (10 * user_profile.weight + 6.25 * COALESCE(user_profile.height, 175) - 5 * COALESCE(user_profile.age, 30) + 5)
        * CASE user_profile.activity_level
            WHEN 'sedentary' THEN 1.2
            WHEN 'light' THEN 1.375
            WHEN 'moderate' THEN 1.55
            WHEN 'active' THEN 1.725
            WHEN 'very_active' THEN 1.9
            ELSE 1.55
          END
      ) - calculated_deficit;
    ELSE
      calculated_calories := 2000;
    END IF;
    
    -- Calculate remaining macros
    calculated_fats := ROUND(calculated_calories * 0.25 / 9);
    calculated_carbs := ROUND((calculated_calories - calculated_protein * 4 - calculated_fats * 9) / 4);
  ELSE
    -- Defaults if no profile data
    calculated_calories := 2000;
    calculated_protein := 150;
    calculated_carbs := 250;
    calculated_fats := 65;
    calculated_deficit := 500;
  END IF;
  
  -- Upsert daily_goals - PRESERVE fluid_goal_ml!
  INSERT INTO daily_goals (
    user_id,
    calories,
    protein,
    carbs,
    fats,
    calorie_deficit,
    fluid_goal_ml,
    updated_at
  )
  VALUES (
    target_user_id,
    calculated_calories,
    calculated_protein,
    calculated_carbs,
    calculated_fats,
    calculated_deficit,
    final_fluid_goal,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    calories = EXCLUDED.calories,
    protein = EXCLUDED.protein,
    carbs = EXCLUDED.carbs,
    fats = EXCLUDED.fats,
    calorie_deficit = EXCLUDED.calorie_deficit,
    -- NEVER overwrite fluid_goal_ml - keep the user's custom value!
    updated_at = NOW();
END;
$$;

-- Also fix the user's current water goal back to 4L
UPDATE daily_goals 
SET fluid_goal_ml = 4000, updated_at = NOW()
WHERE user_id = '84b0664f-0934-49ce-9c35-c99546b792bf';