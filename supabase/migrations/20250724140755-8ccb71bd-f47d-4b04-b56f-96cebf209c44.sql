-- Fix database security issues identified in the security review

-- Add secure search path to existing database functions
ALTER FUNCTION public.update_user_points_and_level(uuid, integer, text, text, numeric, numeric) SET search_path TO 'public';
ALTER FUNCTION public.log_security_event(uuid, text, text, text, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.update_user_streak(uuid, text, date) SET search_path TO 'public';
ALTER FUNCTION public.update_department_progress() SET search_path TO 'public';
ALTER FUNCTION public.check_ai_usage_limit(uuid, text, integer, integer) SET search_path TO 'public';
ALTER FUNCTION public.is_super_admin(uuid) SET search_path TO 'public';
ALTER FUNCTION public.is_enterprise_or_super_admin(uuid) SET search_path TO 'public';
ALTER FUNCTION public.is_admin_by_email() SET search_path TO 'public';
ALTER FUNCTION public.is_super_admin_by_email() SET search_path TO 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';

-- Create enhanced security monitoring table for failed login attempts
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'auth',
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only super admins can view security events
CREATE POLICY "Super admins can view security events"
ON public.security_events
FOR SELECT
USING (is_super_admin());

-- Create function to log security events safely
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  p_user_id UUID DEFAULT NULL,
  p_event_type TEXT DEFAULT 'unknown',
  p_event_category TEXT DEFAULT 'auth',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Create password strength validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;