-- Fix infinite recursion in subscribers table RLS policies

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "select_subscription_enhanced" ON public.subscribers;
DROP POLICY IF EXISTS "update_subscription_enhanced" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription_enhanced" ON public.subscribers;

-- Create safe, non-recursive policies
CREATE POLICY "select_own_subscription_safe" ON public.subscribers
FOR SELECT  
USING (
  -- Allow users to view their own subscription OR by email (for edge functions)
  (user_id = auth.uid()) OR 
  (email = auth.email())
);

CREATE POLICY "update_own_subscription_safe" ON public.subscribers  
FOR UPDATE
USING (
  -- Allow users to update their own subscription OR by email (for edge functions)
  (user_id = auth.uid()) OR
  (email = auth.email())
);

CREATE POLICY "insert_subscription_safe" ON public.subscribers
FOR INSERT
WITH CHECK (
  -- Allow users to insert their own subscription OR by email (for edge functions)
  (user_id = auth.uid()) OR
  (email = auth.email())
);