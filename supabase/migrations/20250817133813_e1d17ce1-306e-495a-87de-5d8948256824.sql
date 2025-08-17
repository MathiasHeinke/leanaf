-- Ensure daily_goals function also forces UPSERT for today's date
CREATE OR REPLACE FUNCTION public.ensure_daily_goals(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  today_goals RECORD;
  p RECORD;
  v_bmr numeric;
  v_multiplier numeric := 1.2;
  v_tdee numeric;
  v_target_cal integer;
  v_protein_g integer;
  v_fat_g integer;
  v_carb_g integer;
  v_fluids integer := 2500; -- sensible default
BEGIN
  -- Load profile attributes (targets + base data)
  SELECT 
    daily_calorie_target,
    protein_target_g,
    carbs_target_g,
    fats_target_g,
    weight,
    height,
    age,
    gender,
    activity_level,
    target_weight,
    goal
  INTO p
  FROM public.profiles 
  WHERE user_id = user_id_param
  LIMIT 1;

  -- Compute BMR (Mifflin-St Jeor) if enough data
  IF p.weight IS NOT NULL AND p.height IS NOT NULL AND p.age IS NOT NULL THEN
    v_bmr := 10 * p.weight + 6.25 * p.height - 5 * p.age 
             + CASE WHEN lower(coalesce(p.gender,'male')) IN ('female','f','woman','w') THEN -161 ELSE 5 END;

    -- Activity multiplier
    v_multiplier := CASE lower(coalesce(p.activity_level,'moderate'))
      WHEN 'sedentary' THEN 1.2
      WHEN 'leicht' THEN 1.375
      WHEN 'light' THEN 1.375
      WHEN 'moderate' THEN 1.55
      WHEN 'moderat' THEN 1.55
      WHEN 'active' THEN 1.725
      WHEN 'aktiv' THEN 1.725
      WHEN 'very_active' THEN 1.9
      WHEN 'sehr_aktiv' THEN 1.9
      ELSE 1.55
    END;

    v_tdee := v_bmr * v_multiplier;

    -- Direction: deficit/surplus
    IF p.target_weight IS NOT NULL AND p.weight IS NOT NULL AND p.target_weight < p.weight THEN
      v_target_cal := round(v_tdee * 0.85);
    ELSIF p.target_weight IS NOT NULL AND p.weight IS NOT NULL AND p.target_weight > p.weight THEN
      v_target_cal := round(v_tdee * 1.10);
    ELSIF lower(coalesce(p.goal,'')) IN ('fat_loss','cut','abnehmen') THEN
      v_target_cal := round(v_tdee * 0.85);
    ELSIF lower(coalesce(p.goal,'')) IN ('hypertrophy','muscle_gain','bulk','aufbau') THEN
      v_target_cal := round(v_tdee * 1.10);
    ELSE
      v_target_cal := round(v_tdee);
    END IF;
  ELSE
    v_target_cal := 2500; -- fallback if data insufficient
  END IF;

  -- Macro defaults if profile targets are missing
  IF p.weight IS NOT NULL THEN
    v_protein_g := GREATEST(100, round(p.weight * 1.8)); -- ~1.8g/kg
    v_fat_g := GREATEST(40, round(p.weight * 0.8));     -- ~0.8g/kg
  ELSE
    v_protein_g := 150;
    v_fat_g := 65;
  END IF;

  v_carb_g := GREATEST(0, round( (v_target_cal - v_protein_g * 4 - v_fat_g * 9) / 4.0 ));

  -- Prefer explicit profile targets when present
  v_target_cal := COALESCE(p.daily_calorie_target::int, v_target_cal);
  v_protein_g := COALESCE(p.protein_target_g::int, v_protein_g);
  v_carb_g := COALESCE(p.carbs_target_g::int, v_carb_g);
  v_fat_g := COALESCE(p.fats_target_g::int, v_fat_g);

  -- Always upsert today's goals - this will update existing entries
  INSERT INTO public.daily_goals (
    user_id, goal_date, calories, protein, carbs, fats, fluids
  ) VALUES (
    user_id_param, CURRENT_DATE, v_target_cal, v_protein_g, v_carb_g, v_fat_g, v_fluids
  )
  ON CONFLICT (user_id, goal_date) DO UPDATE SET
    calories = EXCLUDED.calories,
    protein  = EXCLUDED.protein,
    carbs    = EXCLUDED.carbs,
    fats     = EXCLUDED.fats,
    fluids   = EXCLUDED.fluids,
    updated_at = now()
  RETURNING * INTO today_goals;

  -- Return normalized JSON with aliases used by frontend
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