-- Fix update_user_points_and_level to handle NULL client_event_id
-- The ON CONFLICT clause fails when client_event_id is NULL because the partial unique index
-- only applies to non-NULL values

CREATE OR REPLACE FUNCTION public.update_user_points_and_level(
  p_user_id uuid,
  p_points integer,
  p_activity_type text,
  p_description text DEFAULT NULL::text,
  p_multiplier numeric DEFAULT 1.0,
  p_trial_multiplier numeric DEFAULT 1.0,
  p_client_event_id text DEFAULT NULL::text
)
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
  v_inserted BOOLEAN := FALSE;
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

  -- Handle point activity recording based on whether client_event_id is provided
  IF p_client_event_id IS NOT NULL THEN
    -- Idempotent insert with ON CONFLICT (only works when client_event_id is NOT NULL)
    INSERT INTO public.point_activities (
      user_id, activity_type, points_earned, multiplier, trial_multiplier, description, client_event_id
    ) VALUES (
      p_user_id, p_activity_type, v_final_points, p_multiplier, p_trial_multiplier, p_description, p_client_event_id
    )
    ON CONFLICT (user_id, client_event_id) DO NOTHING;
    
    v_inserted := FOUND;
    
    -- If duplicate event (no insert happened), return current state without re-adding points
    IF NOT v_inserted THEN
      -- Ensure user_points row exists
      INSERT INTO public.user_points (user_id, total_points, current_level, level_name, points_to_next_level)
      VALUES (p_user_id, 0, 1, 'Rookie', 100)
      ON CONFLICT (user_id) DO NOTHING;

      SELECT total_points, current_level, level_name, points_to_next_level
      INTO v_current_points, v_current_level, v_level_name, v_points_to_next
      FROM public.user_points WHERE user_id = p_user_id;

      RETURN jsonb_build_object(
        'total_points', v_current_points,
        'current_level', v_current_level,
        'level_name', v_level_name,
        'points_to_next_level', v_points_to_next,
        'level_up', false,
        'points_earned', 0,
        'duplicate', true
      );
    END IF;
  ELSE
    -- Simple insert WITHOUT ON CONFLICT when client_event_id is NULL
    INSERT INTO public.point_activities (
      user_id, activity_type, points_earned, multiplier, trial_multiplier, description, client_event_id
    ) VALUES (
      p_user_id, p_activity_type, v_final_points, p_multiplier, p_trial_multiplier, p_description, NULL
    );
  END IF;

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