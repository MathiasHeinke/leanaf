-- Fix database function security issues by setting search_path to prevent privilege escalation
-- Using CREATE OR REPLACE to avoid dependency issues

-- Update is_super_admin_by_email function
CREATE OR REPLACE FUNCTION public.is_super_admin_by_email()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails 
    WHERE email = auth.email() 
    AND role IN ('super_admin', 'admin')
    AND is_active = true
  );
$function$;

-- Update is_admin_by_email function
CREATE OR REPLACE FUNCTION public.is_admin_by_email()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails 
    WHERE email = auth.email() 
    AND is_active = true
  );
$function$;

-- Update is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = user_uuid 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  );
$function$;

-- Update is_enterprise_or_super_admin function
CREATE OR REPLACE FUNCTION public.is_enterprise_or_super_admin(user_uuid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = user_uuid 
    AND subscription_tier IN ('Enterprise', 'Super Admin')
    AND subscribed = true
  );
$function$;

-- Update log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(p_user_id uuid, p_action text, p_resource_type text DEFAULT NULL::text, p_resource_id text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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

-- Update log_security_event_enhanced function
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(p_user_id uuid DEFAULT NULL::uuid, p_event_type text DEFAULT 'unknown'::text, p_event_category text DEFAULT 'auth'::text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_severity text DEFAULT 'info'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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

-- Update log_failed_login_attempt function
CREATE OR REPLACE FUNCTION public.log_failed_login_attempt(p_email text DEFAULT NULL::text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_failure_reason text DEFAULT 'Unknown'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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

-- Update validate_password_strength function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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

-- Update check_rate_limit_progressive function
CREATE OR REPLACE FUNCTION public.check_rate_limit_progressive(p_identifier text, p_action text, p_max_attempts integer DEFAULT 5, p_window_minutes integer DEFAULT 15)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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