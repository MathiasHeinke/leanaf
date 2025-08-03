-- Security fixes for admin access and function improvements

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
    AND role IN ('admin', 'super_admin')
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

-- 3. Ensure users cannot escalate their own privileges
CREATE POLICY "Prevent self role escalation" ON public.user_roles
FOR UPDATE
USING (
  -- User cannot update their own role unless they're already a super admin
  (user_id != auth.uid()) OR 
  public.is_super_admin_user(auth.uid())
);

CREATE POLICY "Only super admins can assign admin roles" ON public.user_roles
FOR INSERT
WITH CHECK (
  -- Only super admins can assign admin/super_admin roles
  (role NOT IN ('admin', 'super_admin')) OR 
  public.is_super_admin_user(auth.uid())
);

-- 4. Create security event logging function with proper search_path
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

-- 5. Fix search_path for existing functions to prevent injection
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_credits integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_credits_remaining integer;
  v_can_deduct boolean := false;
BEGIN
  SELECT credits_remaining INTO v_credits_remaining
  FROM user_credits 
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_credits_remaining >= p_credits THEN
    v_can_deduct := true;
    
    UPDATE user_credits 
    SET credits_remaining = credits_remaining - p_credits,
        updated_at = now()
    WHERE user_id = p_user_id;
    
    v_credits_remaining := v_credits_remaining - p_credits;
  END IF;
  
  RETURN jsonb_build_object(
    'success', v_can_deduct,
    'credits_remaining', v_credits_remaining,
    'credits_deducted', CASE WHEN v_can_deduct THEN p_credits ELSE 0 END
  );
END;
$$;

-- 6. Create comprehensive RLS policy for user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT
USING (
  user_id = auth.uid() OR 
  public.is_admin_user(auth.uid())
);

-- 7. Add missing RLS policies for critical tables
-- Ensure security_events table has proper policies
DROP POLICY IF EXISTS "Only admins can insert security events" ON public.security_events;
CREATE POLICY "Only admins can insert security events" ON public.security_events
FOR INSERT
WITH CHECK (
  public.is_admin_user(auth.uid()) OR
  -- Allow system/service role for logging
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);

-- 8. Create function to validate admin access with logging
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
  v_is_admin := public.is_admin_user(v_user_id);
  
  -- Log the access attempt
  PERFORM public.log_admin_access_attempt(
    v_user_id,
    v_is_admin,
    p_resource
  );
  
  RETURN v_is_admin;
END;
$$;