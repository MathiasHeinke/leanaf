-- Create secure admin functions with proper search_path

-- 1. Create secure admin role checking function
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
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
    SELECT 1 FROM user_roles 
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
    SELECT 1 FROM user_roles 
    WHERE user_id = user_uuid 
    AND role IN ('admin', 'super_admin')
  );
$$;

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
  INSERT INTO security_events (
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

-- 5. Create function to validate admin access with logging
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
  v_is_admin := has_admin_access(v_user_id);
  
  -- Log the access attempt
  PERFORM log_admin_access_attempt(
    v_user_id,
    v_is_admin,
    p_resource
  );
  
  RETURN v_is_admin;
END;
$$;

-- 6. Add privilege escalation protection policies
DROP POLICY IF EXISTS "Prevent self role escalation" ON user_roles;
CREATE POLICY "Prevent self role escalation" ON user_roles
FOR UPDATE
USING (
  -- User cannot update their own role unless they're already a super admin
  (user_id != auth.uid()) OR 
  is_super_admin_user(auth.uid())
);

DROP POLICY IF EXISTS "Only super admins can assign admin roles" ON user_roles;
CREATE POLICY "Only super admins can assign admin roles" ON user_roles
FOR INSERT
WITH CHECK (
  -- Only super admins can assign admin/super_admin roles
  (role NOT IN ('admin', 'super_admin')) OR 
  is_super_admin_user(auth.uid())
);

-- 7. Enhanced RLS for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles" ON user_roles
FOR SELECT
USING (
  user_id = auth.uid() OR 
  has_admin_access(auth.uid())
);

-- 8. Improve security_events policies
DROP POLICY IF EXISTS "Only admins can insert security events" ON security_events;
CREATE POLICY "Only admins can insert security events" ON security_events
FOR INSERT
WITH CHECK (
  has_admin_access(auth.uid()) OR
  -- Allow system/service role for logging
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);