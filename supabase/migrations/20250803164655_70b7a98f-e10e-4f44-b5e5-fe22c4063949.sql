-- Phase 1: Critical Database Security Fixes

-- Fix 1: Add proper search paths to security functions to prevent search path issues
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), _role)
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = user_uuid 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin_by_email()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails 
    WHERE email = auth.email() 
    AND role IN ('super_admin', 'admin')
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_by_email()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails 
    WHERE email = auth.email() 
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_enterprise_or_super_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = user_uuid 
    AND subscription_tier IN ('Enterprise', 'Super Admin')
    AND subscribed = true
  );
$$;

-- Fix 2: Add role escalation protection - prevent users from assigning themselves admin roles
CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from assigning super admin or admin roles unless they are already super admins
  IF NEW.role IN ('admin', 'super_admin') THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Only super administrators can assign admin roles';
    END IF;
  END IF;
  
  -- Log role changes for security auditing
  INSERT INTO public.security_events (
    user_id, 
    event_type, 
    event_category, 
    severity,
    metadata
  ) VALUES (
    NEW.user_id,
    'role_assigned',
    'security',
    'warning',
    jsonb_build_object(
      'role', NEW.role,
      'assigned_by', auth.uid(),
      'timestamp', now()
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Apply the trigger to user_roles table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON public.user_roles;
    CREATE TRIGGER validate_role_assignment_trigger
      BEFORE INSERT OR UPDATE ON public.user_roles
      FOR EACH ROW EXECUTE FUNCTION public.validate_role_assignment();
  END IF;
END $$;

-- Fix 3: Enhanced security audit logging with proper search path
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  p_user_id uuid DEFAULT NULL::uuid, 
  p_event_type text DEFAULT 'unknown'::text, 
  p_event_category text DEFAULT 'auth'::text, 
  p_ip_address inet DEFAULT NULL::inet, 
  p_user_agent text DEFAULT NULL::text, 
  p_metadata jsonb DEFAULT '{}'::jsonb, 
  p_severity text DEFAULT 'info'::text
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