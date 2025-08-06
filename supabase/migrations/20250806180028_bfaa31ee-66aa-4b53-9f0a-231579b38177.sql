-- CRITICAL SECURITY FIX: Fix database functions search_path and RLS policies

-- 1. Fix search_path for critical security definer functions
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM admin_emails ae
    JOIN auth.users u ON u.email = ae.email
    WHERE u.id = user_uuid 
      AND ae.role = 'super_admin' 
      AND ae.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_admin_access(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_uuid 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- 2. CRITICAL: Fix user_roles RLS policies to prevent privilege escalation
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Users should NOT be able to insert or update their own roles
CREATE POLICY "Only super admins can assign roles" ON public.user_roles
FOR ALL USING (is_super_admin());

-- Users can only view their own roles (recreated safely)
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

-- 3. Create a secure trace logging function (to replace frontend service role usage)
CREATE OR REPLACE FUNCTION public.log_trace_event(
  p_trace_id text,
  p_stage text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow authenticated users to log trace events
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for trace logging';
  END IF;

  INSERT INTO public.coach_traces (
    trace_id,
    ts,
    stage,
    data
  ) VALUES (
    p_trace_id,
    now(),
    p_stage,
    p_data || jsonb_build_object(
      'user_id', auth.uid(),
      'timestamp', now()
    )
  );
END;
$$;