-- Drop the existing insert policy
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;

-- Create a new policy that allows users to insert their own subscription OR Enterprise users to insert for others
CREATE POLICY "insert_subscription_enhanced" ON public.subscribers
FOR INSERT
WITH CHECK (
  -- Allow users to insert their own subscription
  (user_id = auth.uid()) OR
  -- Allow Enterprise users to insert subscriptions for other users
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Enterprise' 
    AND subscribed = true
  ))
);