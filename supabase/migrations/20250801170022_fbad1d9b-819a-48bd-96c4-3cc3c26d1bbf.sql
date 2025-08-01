-- Temporär SEHR hohe Rate Limits für Premium Users setzen
CREATE OR REPLACE FUNCTION public.check_ai_usage_limit(
  p_user_id uuid, 
  p_feature_type text, 
  p_daily_limit integer DEFAULT 5, 
  p_monthly_limit integer DEFAULT 150
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Premium-Check vereinfacht
  v_is_premium BOOLEAN := FALSE;
  v_current_date DATE := CURRENT_DATE;
  v_current_month DATE := DATE_TRUNC('month', CURRENT_DATE);
  v_daily_count INTEGER := 0;
  v_monthly_count INTEGER := 0;
  v_can_use BOOLEAN := FALSE;
BEGIN
  -- ✅ EINHEITLICHE Premium-Erkennung: subscribed = true = Premium
  SELECT EXISTS(
    SELECT 1 FROM public.subscribers 
    WHERE user_id = p_user_id 
    AND subscribed = true
  ) INTO v_is_premium;
  
  -- ✅ Premium Users = UNLIMITED (keine Limits)
  IF v_is_premium THEN
    RETURN jsonb_build_object(
      'can_use', true,
      'daily_count', 0,
      'monthly_count', 0,
      'daily_limit', 999999,
      'monthly_limit', 999999,
      'daily_remaining', 999999,
      'monthly_remaining', 999999,
      'is_premium', true
    );
  END IF;
  
  -- Free Users: Sehr hohe temporäre Limits zum Testen
  p_daily_limit := 100;  -- War: 2-5
  p_monthly_limit := 1000; -- War: 60-150
  
  -- Rest der Free-User Logik bleibt gleich...
  INSERT INTO public.ai_usage_limits (user_id, feature_type, daily_count, monthly_count, last_reset_date, last_reset_month)
  VALUES (p_user_id, p_feature_type, 0, 0, v_current_date, v_current_month)
  ON CONFLICT (user_id, feature_type) DO NOTHING;
  
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
  
  v_can_use := (v_daily_count < p_daily_limit) AND (v_monthly_count < p_monthly_limit);
  
  IF v_can_use THEN
    UPDATE public.ai_usage_limits
    SET 
      daily_count = CASE WHEN last_reset_date < v_current_date THEN 1 ELSE daily_count + 1 END,
      monthly_count = CASE WHEN last_reset_month < v_current_month THEN 1 ELSE monthly_count + 1 END,
      last_reset_date = v_current_date,
      last_reset_month = v_current_month,
      updated_at = now()
    WHERE user_id = p_user_id AND feature_type = p_feature_type;
    
    SELECT daily_count, monthly_count
    INTO v_daily_count, v_monthly_count
    FROM public.ai_usage_limits
    WHERE user_id = p_user_id AND feature_type = p_feature_type;
  END IF;
  
  RETURN jsonb_build_object(
    'can_use', v_can_use,
    'daily_count', v_daily_count,
    'monthly_count', v_monthly_count,
    'daily_limit', p_daily_limit,
    'monthly_limit', p_monthly_limit,
    'daily_remaining', GREATEST(0, p_daily_limit - v_daily_count),
    'monthly_remaining', GREATEST(0, p_monthly_limit - v_monthly_count),
    'is_premium', false
  );
END;
$function$;