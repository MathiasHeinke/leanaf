-- Security fixes for admin access - corrected for existing enum values

-- First, add super_admin to the enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END $$;

-- 1. Create secure admin role checking function (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid 
    AND role = 'admin'
  );
$$;

-- 2. Create function to check if user is super admin  
CREATE OR REPLACE FUNCTION public.is_super_admin_user(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid 
    AND role = 'super_admin'
  );
$$;

-- 3. Create function that checks for any admin level access
CREATE OR REPLACE FUNCTION public.has_admin_access(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- 4. Ensure users cannot escalate their own privileges
DROP POLICY IF EXISTS "Prevent self role escalation" ON public.user_roles;
CREATE POLICY "Prevent self role escalation" ON public.user_roles
FOR UPDATE
USING (
  -- User cannot update their own role unless they're already a super admin
  (user_id != auth.uid()) OR 
  public.is_super_admin_user(auth.uid())
);

DROP POLICY IF EXISTS "Only super admins can assign admin roles" ON public.user_roles;
CREATE POLICY "Only super admins can assign admin roles" ON public.user_roles
FOR INSERT
WITH CHECK (
  -- Only super admins can assign admin/super_admin roles
  (role NOT IN ('admin', 'super_admin')) OR 
  public.is_super_admin_user(auth.uid())
);

-- 5. Create security event logging function with proper search_path
CREATE OR REPLACE FUNCTION public.log_admin_access_attempt(
  p_user_id uuid,
  p_access_granted boolean,
  p_requested_resource text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    event_category,
    severity,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_user_id,
    'admin_access_attempt',
    'authorization',
    CASE WHEN p_access_granted THEN 'info' ELSE 'warning' END,
    p_ip_address,
    p_user_agent,
    jsonb_build_object(
      'access_granted', p_access_granted,
      'requested_resource', p_requested_resource,
      'timestamp', now()
    )
  );
END;
$$;

-- 6. Create function to validate admin access with logging
CREATE OR REPLACE FUNCTION public.validate_admin_access(
  p_resource text DEFAULT 'admin_panel'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  -- Check if user is admin
  v_is_admin := public.has_admin_access(v_user_id);
  
  -- Log the access attempt
  PERFORM public.log_admin_access_attempt(
    v_user_id,
    v_is_admin,
    p_resource
  );
  
  RETURN v_is_admin;
END;
$$;