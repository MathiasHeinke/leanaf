-- Fix inconsistent RLS policies for subscribers table

-- Drop the existing overly permissive update policy
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- Create a new update policy that matches the Enterprise logic from insert policy
CREATE POLICY "update_subscription_enhanced" ON public.subscribers  
FOR UPDATE
USING (
  -- Allow users to update their own subscription OR Enterprise users to update for others
  (user_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Enterprise' 
    AND subscribed = true
  ))
);

-- Also update the select policy to allow Enterprise users to view all subscriptions
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;

CREATE POLICY "select_subscription_enhanced" ON public.subscribers
FOR SELECT  
USING (
  -- Allow users to view their own subscription OR Enterprise users to view all subscriptions
  (user_id = auth.uid()) OR 
  (email = auth.email()) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Enterprise' 
    AND subscribed = true
  ))
);