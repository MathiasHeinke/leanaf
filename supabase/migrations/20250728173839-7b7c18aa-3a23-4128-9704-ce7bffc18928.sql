-- Fix all remaining functions with search path vulnerability

-- 1. Fix validate_password_strength function 
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  score INTEGER := 0;
  feedback TEXT[] := ARRAY[]::TEXT[];
  has_upper BOOLEAN := FALSE;
  has_lower BOOLEAN := FALSE;
  has_digit BOOLEAN := FALSE;
  has_special BOOLEAN := FALSE;
  length_check BOOLEAN := FALSE;
BEGIN
  -- Check length
  IF length(password) >= 12 THEN
    score := score + 2;
    length_check := TRUE;
  ELSIF length(password) >= 8 THEN
    score := score + 1;
    length_check := TRUE;
    feedback := array_append(feedback, 'Consider using a longer password for better security');
  ELSE
    feedback := array_append(feedback, 'Password must be at least 8 characters long');
  END IF;
  
  -- Check for uppercase
  IF password ~ '[A-Z]' THEN
    has_upper := TRUE;
    score := score + 1;
  ELSE
    feedback := array_append(feedback, 'Add uppercase letters');
  END IF;
  
  -- Check for lowercase
  IF password ~ '[a-z]' THEN
    has_lower := TRUE;
    score := score + 1;
  ELSE
    feedback := array_append(feedback, 'Add lowercase letters');
  END IF;
  
  -- Check for digits
  IF password ~ '[0-9]' THEN
    has_digit := TRUE;
    score := score + 1;
  ELSE
    feedback := array_append(feedback, 'Add numbers');
  END IF;
  
  -- Check for special characters
  IF password ~ '[^A-Za-z0-9]' THEN
    has_special := TRUE;
    score := score + 1;
  ELSE
    feedback := array_append(feedback, 'Add special characters');
  END IF;
  
  -- Bonus points for very long passwords
  IF length(password) >= 16 THEN
    score := score + 1;
  END IF;
  
  RETURN jsonb_build_object(
    'score', score,
    'max_score', 7,
    'is_strong', score >= 5,
    'is_valid', length_check AND has_upper AND has_lower AND has_digit,
    'feedback', feedback,
    'strength', 
      CASE 
        WHEN score >= 6 THEN 'very_strong'
        WHEN score >= 5 THEN 'strong'
        WHEN score >= 3 THEN 'medium'
        WHEN score >= 2 THEN 'weak'
        ELSE 'very_weak'
      END
  );
END;
$function$;

-- 2. Fix check_rate_limit_progressive function
CREATE OR REPLACE FUNCTION public.check_rate_limit_progressive(p_identifier text, p_action text, p_max_attempts integer DEFAULT 5, p_window_minutes integer DEFAULT 15)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_attempts INTEGER := 0;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_delay_seconds INTEGER := 0;
  v_allowed BOOLEAN := TRUE;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Count recent attempts
  SELECT COUNT(*)
  INTO v_attempts
  FROM public.security_events
  WHERE (metadata->>'identifier') = p_identifier
    AND event_type = p_action
    AND created_at >= v_window_start;
  
  -- Calculate progressive delay (exponential backoff)
  IF v_attempts >= p_max_attempts THEN
    v_allowed := FALSE;
    v_delay_seconds := LEAST(POWER(2, v_attempts - p_max_attempts) * 60, 3600); -- Max 1 hour
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'attempts', v_attempts,
    'max_attempts', p_max_attempts,
    'delay_seconds', v_delay_seconds,
    'window_minutes', p_window_minutes
  );
END;
$function$;

-- 3. Fix log_security_event_enhanced function
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(p_user_id uuid DEFAULT NULL::uuid, p_event_type text DEFAULT 'unknown'::text, p_event_category text DEFAULT 'auth'::text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_severity text DEFAULT 'info'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    event_category,
    ip_address,
    user_agent,
    metadata,
    severity
  )
  VALUES (
    p_user_id,
    p_event_type,
    p_event_category,
    p_ip_address,
    p_user_agent,
    p_metadata,
    p_severity
  );
END;
$function$;

-- 4. Fix log_failed_login_attempt function
CREATE OR REPLACE FUNCTION public.log_failed_login_attempt(p_email text DEFAULT NULL::text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_failure_reason text DEFAULT 'Unknown'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.failed_login_attempts (
    email,
    ip_address, 
    user_agent,
    failure_reason,
    metadata
  )
  VALUES (
    p_email,
    p_ip_address,
    p_user_agent, 
    p_failure_reason,
    p_metadata
  );
END;
$function$;

-- 5. Fix update_user_streak function
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id uuid, p_streak_type text, p_activity_date date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- 6. Fix update_department_progress function
CREATE OR REPLACE FUNCTION public.update_department_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- 7. Fix update_user_points_and_level function
CREATE OR REPLACE FUNCTION public.update_user_points_and_level(p_user_id uuid, p_points integer, p_activity_type text, p_description text DEFAULT NULL::text, p_multiplier numeric DEFAULT 1.0, p_trial_multiplier numeric DEFAULT 1.0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  -- Validate input parameters
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  IF p_points < 0 THEN
    RAISE EXCEPTION 'Points cannot be negative';
  END IF;
  
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

-- 8. Fix award_badge_atomically function
CREATE OR REPLACE FUNCTION public.award_badge_atomically(p_user_id uuid, p_badge_type text, p_badge_name text, p_badge_description text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO badges (user_id, badge_type, badge_name, badge_description, metadata)
  VALUES (p_user_id, p_badge_type, p_badge_name, p_badge_description, p_metadata)
  ON CONFLICT (user_id, badge_type, badge_name) DO NOTHING;
  
  -- Return true if a new badge was inserted, false if it already existed
  RETURN FOUND;
END;
$function$;