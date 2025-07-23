-- Fix INSERT policy for subscribers table to allow Super Admin to insert for any user

DROP POLICY IF EXISTS "insert_subscription_safe_no_recursion" ON public.subscribers;

CREATE POLICY "insert_subscription_super_admin_allowed" ON public.subscribers
FOR INSERT
WITH CHECK (
  -- Allow users to insert their own subscription OR Super Admin can insert for anyone
  (user_id = auth.uid()) OR 
  (email = auth.email()) OR
  public.is_super_admin()
);