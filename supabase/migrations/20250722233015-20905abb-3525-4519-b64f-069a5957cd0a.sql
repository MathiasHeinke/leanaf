
-- Update the check_ai_usage_limit function to support new feature types with different limits
CREATE OR REPLACE FUNCTION public.check_ai_usage_limit(
  p_user_id UUID,
  p_feature_type TEXT,
  p_daily_limit INTEGER DEFAULT 5,
  p_monthly_limit INTEGER DEFAULT 150
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;
