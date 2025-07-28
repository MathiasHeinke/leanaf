-- Fix critical security vulnerability: Function Search Path Mutable
-- Add SET search_path to all security-sensitive functions

-- 1. Fix log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(p_user_id uuid, p_action text, p_resource_type text DEFAULT NULL::text, p_resource_id text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, 
    action, 
    resource_type, 
    resource_id, 
    metadata
  )
  VALUES (
    p_user_id, 
    p_action, 
    p_resource_type, 
    p_resource_id, 
    p_metadata
  );
END;
$function$;

-- 2. Fix is_super_admin_by_email function
CREATE OR REPLACE FUNCTION public.is_super_admin_by_email()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails 
    WHERE email = auth.email() 
    AND role IN ('super_admin', 'admin')
    AND is_active = true
  );
$function$;

-- 3. Fix handle_new_user_tracking_preferences function
CREATE OR REPLACE FUNCTION public.handle_new_user_tracking_preferences()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default tracking preferences for new user
  INSERT INTO public.user_tracking_preferences (user_id, tracking_type, is_enabled, display_order)
  VALUES 
    (NEW.id, 'meal_input', true, 1),
    (NEW.id, 'weight_tracking', false, 2),
    (NEW.id, 'sleep_tracking', false, 3),
    (NEW.id, 'fluid_tracking', false, 4),
    (NEW.id, 'workout_tracking', false, 5),
    (NEW.id, 'supplement_tracking', false, 6);
  
  RETURN NEW;
END;
$function$;

-- 4. Fix handle_new_user_premium function
CREATE OR REPLACE FUNCTION public.handle_new_user_premium()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_users INTEGER;
BEGIN
  -- Count total registered users
  SELECT COUNT(*) INTO total_users FROM auth.users;
  
  -- If we have less than 50 users, give Premium for 12 months
  IF total_users <= 50 THEN
    -- Insert into subscribers table with Premium
    INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
    VALUES (
      NEW.id, 
      NEW.email, 
      true, 
      'Premium', 
      (CURRENT_TIMESTAMP + INTERVAL '12 months')::timestamptz
    );
    
    -- Log this premium assignment
    INSERT INTO public.admin_logs (admin_user_id, action_type, target_user_id, action_details)
    VALUES (
      NEW.id,
      'auto_premium_assigned',
      NEW.id,
      jsonb_build_object(
        'reason', 'new_user_under_50_limit',
        'total_users', total_users,
        'subscription_end', (CURRENT_TIMESTAMP + INTERVAL '12 months')::timestamptz
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 5. Fix is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = user_uuid 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  );
$function$;

-- 6. Fix check_ai_usage_limit function
CREATE OR REPLACE FUNCTION public.check_ai_usage_limit(p_user_id uuid, p_feature_type text, p_daily_limit integer DEFAULT 5, p_monthly_limit integer DEFAULT 150)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- 7. Fix is_admin_by_email function
CREATE OR REPLACE FUNCTION public.is_admin_by_email()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails 
    WHERE email = auth.email() 
    AND is_active = true
  );
$function$;

-- 8. Fix is_enterprise_or_super_admin function
CREATE OR REPLACE FUNCTION public.is_enterprise_or_super_admin(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = user_uuid 
    AND subscription_tier IN ('Enterprise', 'Super Admin')
    AND subscribed = true
  );
$function$;