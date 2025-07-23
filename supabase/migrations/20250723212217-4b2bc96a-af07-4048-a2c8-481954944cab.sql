-- Security Enhancement: Fix search path vulnerabilities in database functions
-- Update all security definer functions to use secure search_path

-- Fix is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = user_uuid 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  );
$function$;

-- Fix is_enterprise_or_super_admin function
CREATE OR REPLACE FUNCTION public.is_enterprise_or_super_admin(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = user_uuid 
    AND subscription_tier IN ('Enterprise', 'Super Admin')
    AND subscribed = true
  );
$function$;

-- Fix is_super_admin_by_email function
CREATE OR REPLACE FUNCTION public.is_super_admin_by_email()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT auth.email() IN (
    'admin@example.com',
    'superadmin@example.com',
    'support@kaloai.de'
  );
$function$;

-- Fix update_user_points_and_level function
CREATE OR REPLACE FUNCTION public.update_user_points_and_level(p_user_id uuid, p_points integer, p_activity_type text, p_description text DEFAULT NULL::text, p_multiplier numeric DEFAULT 1.0, p_trial_multiplier numeric DEFAULT 1.0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_current_points INTEGER;
  v_current_level INTEGER;
  v_level_name TEXT;
  v_points_to_next INTEGER;
  v_new_level INTEGER;
  v_new_level_name TEXT;
  v_level_up BOOLEAN := FALSE;
  v_final_points INTEGER;
  v_total_multiplier NUMERIC;
BEGIN
  -- Apply both multipliers
  v_total_multiplier := p_multiplier * p_trial_multiplier;
  v_final_points := ROUND(p_points * v_total_multiplier);
  
  -- Insert point activity with trial multiplier
  INSERT INTO public.point_activities (user_id, activity_type, points_earned, multiplier, trial_multiplier, description)
  VALUES (p_user_id, p_activity_type, v_final_points, p_multiplier, p_trial_multiplier, p_description);
  
  -- Get or create user points record
  INSERT INTO public.user_points (user_id, total_points, current_level, level_name, points_to_next_level)
  VALUES (p_user_id, 0, 1, 'Rookie', 100)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update total points
  UPDATE public.user_points 
  SET total_points = total_points + v_final_points,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Get current state
  SELECT total_points, current_level, level_name, points_to_next_level
  INTO v_current_points, v_current_level, v_level_name, v_points_to_next
  FROM public.user_points 
  WHERE user_id = p_user_id;
  
  -- Calculate new level
  v_new_level := v_current_level;
  v_new_level_name := v_level_name;
  
  -- Level progression logic
  WHILE v_current_points >= v_points_to_next LOOP
    v_new_level := v_new_level + 1;
    v_level_up := TRUE;
    
    -- Set level names and point requirements
    CASE v_new_level
      WHEN 2 THEN v_new_level_name := 'Bronze'; v_points_to_next := 200;
      WHEN 3 THEN v_new_level_name := 'Silver'; v_points_to_next := 350;
      WHEN 4 THEN v_new_level_name := 'Gold'; v_points_to_next := 550;
      WHEN 5 THEN v_new_level_name := 'Platinum'; v_points_to_next := 800;
      WHEN 6 THEN v_new_level_name := 'Diamond'; v_points_to_next := 1100;
      WHEN 7 THEN v_new_level_name := 'Master'; v_points_to_next := 1500;
      ELSE v_new_level_name := 'Grandmaster'; v_points_to_next := v_points_to_next + 500;
    END CASE;
  END LOOP;
  
  -- Update level if changed
  IF v_level_up THEN
    UPDATE public.user_points 
    SET current_level = v_new_level,
        level_name = v_new_level_name,
        points_to_next_level = v_points_to_next,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Return result
  RETURN jsonb_build_object(
    'total_points', v_current_points,
    'current_level', v_new_level,
    'level_name', v_new_level_name,
    'points_to_next_level', v_points_to_next,
    'level_up', v_level_up,
    'points_earned', v_final_points
  );
END;
$function$;

-- Fix update_user_streak function
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id uuid, p_streak_type text, p_activity_date date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_last_activity_date DATE;
BEGIN
  -- Get current streak data
  SELECT current_streak, longest_streak, last_activity_date
  INTO v_current_streak, v_longest_streak, v_last_activity_date
  FROM public.user_streaks
  WHERE user_id = p_user_id AND streak_type = p_streak_type;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, p_streak_type, 1, 1, p_activity_date);
    RETURN 1;
  END IF;
  
  -- Check if activity is consecutive
  IF v_last_activity_date IS NULL OR p_activity_date = v_last_activity_date + 1 THEN
    -- Continue or start streak
    v_current_streak := v_current_streak + 1;
  ELSIF p_activity_date > v_last_activity_date + 1 THEN
    -- Streak broken, reset
    v_current_streak := 1;
  END IF;
  
  -- Update longest streak if necessary
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  -- Update record
  UPDATE public.user_streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_activity_date = p_activity_date,
      updated_at = now()
  WHERE user_id = p_user_id AND streak_type = p_streak_type;
  
  RETURN v_current_streak;
END;
$function$;

-- Fix update_department_progress function
CREATE OR REPLACE FUNCTION public.update_department_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_department TEXT;
  v_current_points INTEGER := 0;
  v_current_level INTEGER := 1;
  v_new_level INTEGER;
BEGIN
  -- Bestimme Department basierend auf activity_type
  CASE NEW.activity_type
    WHEN 'workout_completed', 'exercise_logged' THEN
      v_department := 'training';
    WHEN 'meal_tracked', 'meal_tracked_with_photo', 'calorie_deficit_met', 'protein_goal_met' THEN
      v_department := 'nutrition';
    WHEN 'weight_measured', 'body_measurements', 'sleep_tracked', 'daily_login' THEN
      v_department := 'tracking';
    ELSE
      RETURN NEW; -- Unbekannte activity_type, nichts tun
  END CASE;

  -- Hole aktuelle department_progress oder erstelle neuen Eintrag
  INSERT INTO public.department_progress (user_id, department, level, points)
  VALUES (NEW.user_id, v_department, 1, 0)
  ON CONFLICT (user_id, department) DO NOTHING;

  -- Aktualisiere Punkte
  UPDATE public.department_progress 
  SET points = points + NEW.points_earned,
      updated_at = now()
  WHERE user_id = NEW.user_id AND department = v_department
  RETURNING points, level INTO v_current_points, v_current_level;

  -- Berechne neues Level (jedes Level braucht 50 mehr Punkte)
  v_new_level := (v_current_points / 50) + 1;

  -- Aktualisiere Level falls nötig
  IF v_new_level > v_current_level THEN
    UPDATE public.department_progress 
    SET level = v_new_level,
        updated_at = now()
    WHERE user_id = NEW.user_id AND department = v_department;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix check_ai_usage_limit function
CREATE OR REPLACE FUNCTION public.check_ai_usage_limit(p_user_id uuid, p_feature_type text, p_daily_limit integer DEFAULT 5, p_monthly_limit integer DEFAULT 150)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_current_date DATE := CURRENT_DATE;
  v_current_month DATE := DATE_TRUNC('month', CURRENT_DATE);
  v_current_week DATE := DATE_TRUNC('week', CURRENT_DATE);
  v_daily_count INTEGER := 0;
  v_monthly_count INTEGER := 0;
  v_weekly_count INTEGER := 0;
  v_can_use BOOLEAN := FALSE;
  v_weekly_limit INTEGER := 7; -- Default weekly limit
BEGIN
  -- Set feature-specific limits for free users
  CASE p_feature_type
    WHEN 'meal_analysis' THEN
      p_daily_limit := 5;
      p_monthly_limit := 150;
    WHEN 'coach_chat' THEN
      p_daily_limit := 2;
      p_monthly_limit := 60;
    WHEN 'coach_recipes' THEN
      p_daily_limit := 1;
      p_monthly_limit := 30;
    WHEN 'daily_analysis' THEN
      p_daily_limit := 0; -- No daily limit
      v_weekly_limit := 1; -- 1 per week
      p_monthly_limit := 4;
    ELSE
      -- Default limits for unknown features
      p_daily_limit := 1;
      p_monthly_limit := 30;
  END CASE;

  -- Get or create usage record
  INSERT INTO public.ai_usage_limits (user_id, feature_type, daily_count, monthly_count, last_reset_date, last_reset_month)
  VALUES (p_user_id, p_feature_type, 0, 0, v_current_date, v_current_month)
  ON CONFLICT (user_id, feature_type) DO NOTHING;
  
  -- Get current usage and reset if needed
  SELECT 
    CASE 
      WHEN last_reset_date < v_current_date THEN 0 
      ELSE daily_count 
    END,
    CASE 
      WHEN last_reset_month < v_current_month THEN 0 
      ELSE monthly_count 
    END
  INTO v_daily_count, v_monthly_count
  FROM public.ai_usage_limits
  WHERE user_id = p_user_id AND feature_type = p_feature_type;
  
  -- For weekly features like daily_analysis, check weekly usage
  IF p_feature_type = 'daily_analysis' THEN
    -- Count entries from this week
    SELECT COUNT(*)
    INTO v_weekly_count
    FROM public.ai_usage_limits
    WHERE user_id = p_user_id 
      AND feature_type = p_feature_type
      AND last_reset_date >= v_current_week;
      
    v_can_use := (v_weekly_count < v_weekly_limit) AND (v_monthly_count < p_monthly_limit);
  ELSE
    -- For daily features, check daily and monthly limits
    v_can_use := (v_daily_count < p_daily_limit) AND (v_monthly_count < p_monthly_limit);
  END IF;
  
  -- If usage allowed, increment counters
  IF v_can_use THEN
    UPDATE public.ai_usage_limits
    SET 
      daily_count = CASE WHEN last_reset_date < v_current_date THEN 1 ELSE daily_count + 1 END,
      monthly_count = CASE WHEN last_reset_month < v_current_month THEN 1 ELSE monthly_count + 1 END,
      last_reset_date = v_current_date,
      last_reset_month = v_current_month,
      updated_at = now()
    WHERE user_id = p_user_id AND feature_type = p_feature_type;
    
    -- Get updated counts
    SELECT daily_count, monthly_count
    INTO v_daily_count, v_monthly_count
    FROM public.ai_usage_limits
    WHERE user_id = p_user_id AND feature_type = p_feature_type;
  END IF;
  
  RETURN jsonb_build_object(
    'can_use', v_can_use,
    'daily_count', v_daily_count,
    'monthly_count', v_monthly_count,
    'weekly_count', COALESCE(v_weekly_count, 0),
    'daily_limit', p_daily_limit,
    'monthly_limit', p_monthly_limit,
    'weekly_limit', v_weekly_limit,
    'daily_remaining', GREATEST(0, p_daily_limit - v_daily_count),
    'monthly_remaining', GREATEST(0, p_monthly_limit - v_monthly_count),
    'weekly_remaining', GREATEST(0, v_weekly_limit - COALESCE(v_weekly_count, 0))
  );
END;
$function$;