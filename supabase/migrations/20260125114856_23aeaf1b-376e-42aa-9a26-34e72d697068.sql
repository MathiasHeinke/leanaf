-- Drop existing function and recreate with correct signature
DROP FUNCTION IF EXISTS public.update_user_streak(UUID, TEXT);
DROP FUNCTION IF EXISTS public.update_user_streak(UUID);

-- Recreate update_user_streak RPC function
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_active DATE;
  v_today DATE := CURRENT_DATE;
  v_new_streak INT;
  v_longest INT;
  v_multiplier NUMERIC(3,2);
BEGIN
  -- Get current state
  SELECT last_active_date, current_streak, longest_streak
  INTO v_last_active, v_new_streak, v_longest
  FROM user_progress
  WHERE user_id = p_user_id;

  -- Handle new user
  IF v_last_active IS NULL THEN
    v_new_streak := 1;
    v_longest := 1;
  -- Same day - no change
  ELSIF v_last_active = v_today THEN
    NULL;
  -- Consecutive day - increment streak
  ELSIF v_last_active = v_today - 1 THEN
    v_new_streak := COALESCE(v_new_streak, 0) + 1;
    v_longest := GREATEST(COALESCE(v_longest, 0), v_new_streak);
  -- Gap - reset streak
  ELSE
    v_new_streak := 1;
  END IF;

  -- Calculate streak multiplier
  v_multiplier := CASE
    WHEN v_new_streak >= 30 THEN 2.0
    WHEN v_new_streak >= 14 THEN 1.75
    WHEN v_new_streak >= 7 THEN 1.5
    WHEN v_new_streak >= 3 THEN 1.25
    ELSE 1.0
  END;

  -- Upsert progress
  INSERT INTO user_progress (user_id, current_streak, longest_streak, last_active_date, updated_at)
  VALUES (p_user_id, v_new_streak, v_longest, v_today, now())
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = v_new_streak,
    longest_streak = v_longest,
    last_active_date = v_today,
    updated_at = now();

  RETURN jsonb_build_object(
    'streak', v_new_streak,
    'longest_streak', v_longest,
    'multiplier', v_multiplier,
    'last_active', v_today
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_user_streak(UUID) TO authenticated;