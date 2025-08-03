-- Fix the is_super_admin function to check admin_emails table
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
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