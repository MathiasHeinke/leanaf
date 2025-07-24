-- Security Enhancement Migration: Database Function Hardening
-- Add secure search paths to existing database functions that don't have them

-- Update existing functions to have secure search paths
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

-- Create enhanced failed login tracking table for better security monitoring
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  ip_address INET,
  user_agent TEXT,
  attempt_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on failed login attempts
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for failed login attempts (only admins can view)
CREATE POLICY "Only admins can view failed login attempts" ON public.failed_login_attempts
  FOR SELECT USING (public.is_admin_by_email());

-- Create index for efficient queries on failed login attempts
CREATE INDEX IF NOT EXISTS idx_failed_logins_email_time ON public.failed_login_attempts(email, attempt_time);
CREATE INDEX IF NOT EXISTS idx_failed_logins_ip_time ON public.failed_login_attempts(ip_address, attempt_time);

-- Function to safely log failed login attempts
CREATE OR REPLACE FUNCTION public.log_failed_login_attempt(
  p_email TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT 'Unknown',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
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

-- Enhanced rate limiting function with progressive delays
CREATE OR REPLACE FUNCTION public.check_rate_limit_progressive(
  p_identifier TEXT,
  p_action TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS JSONB
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