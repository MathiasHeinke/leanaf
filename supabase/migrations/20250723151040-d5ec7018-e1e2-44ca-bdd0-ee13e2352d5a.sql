-- Fix circular dependency in subscribers table RLS policies
-- Create a hardcoded super admin check to break the circular dependency

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "insert_subscription_super_admin_allowed" ON public.subscribers;

-- Create a new function that uses hardcoded super admin emails to break circular dependency
CREATE OR REPLACE FUNCTION public.is_super_admin_by_email()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.email() IN (
    'admin@example.com',
    'superadmin@example.com',
    'support@kaloai.de'
  );
$$;

-- Create new INSERT policy that uses email-based check instead of table lookup
CREATE POLICY "insert_subscription_no_recursion" ON public.subscribers
FOR INSERT
WITH CHECK (
  -- Allow users to insert their own subscription
  (user_id = auth.uid()) OR 
  (email = auth.email()) OR
  -- Allow hardcoded super admin emails
  public.is_super_admin_by_email()
);