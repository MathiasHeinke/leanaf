
-- Drop the existing policy that only allows users to see their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a new policy that allows users to view their own profile OR allows Enterprise users to view all profiles
CREATE POLICY "Users can view own profile or Enterprise users can view all profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  -- Allow users to view their own profile OR if they have Enterprise subscription
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Enterprise' 
    AND subscribed = true
  ))
);
