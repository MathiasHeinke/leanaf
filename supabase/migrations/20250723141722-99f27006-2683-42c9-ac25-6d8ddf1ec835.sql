-- Create a super admin role for debugging purposes
-- First check if user already exists in subscribers table
DO $$
DECLARE
    admin_user_id UUID := '84b0664f-0934-49ce-9c35-c99546b792bf';
    admin_email TEXT := 'office@mathiasheinke.de';
BEGIN
    -- Insert or update admin user with Super Admin privileges
    INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end, created_at, updated_at)
    VALUES (admin_user_id, admin_email, true, 'Super Admin', NULL, now(), now())
    ON CONFLICT (email) 
    DO UPDATE SET 
        user_id = admin_user_id,
        subscribed = true,
        subscription_tier = 'Super Admin',
        subscription_end = NULL,
        updated_at = now();
        
    -- Also ensure profile exists
    INSERT INTO public.profiles (user_id, email, display_name, created_at, updated_at)
    VALUES (admin_user_id, admin_email, 'Super Admin', now(), now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        email = admin_email,
        display_name = 'Super Admin',
        updated_at = now();
END $$;

-- Update RLS policies to allow Super Admin full access to all tables
-- Profiles table - allow Super Admin to see all profiles
DROP POLICY IF EXISTS "Users can view own profile or Enterprise users can view all pro" ON public.profiles;

CREATE POLICY "Users can view own profile or Super Admin can view all profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  -- Allow users to view their own profile OR Super Admin can view all
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier IN ('Enterprise', 'Super Admin')
    AND subscribed = true
  ))
);

-- Subscribers table - allow Super Admin to see all subscriptions
DROP POLICY IF EXISTS "select_own_subscription_safe" ON public.subscribers;

CREATE POLICY "select_subscription_super_admin_safe" ON public.subscribers
FOR SELECT  
USING (
  -- Allow users to view their own subscription OR Super Admin can view all
  (user_id = auth.uid()) OR 
  (email = auth.email()) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  ))
);

-- Allow Super Admin to update any subscription
DROP POLICY IF EXISTS "update_own_subscription_safe" ON public.subscribers;

CREATE POLICY "update_subscription_super_admin_safe" ON public.subscribers  
FOR UPDATE
USING (
  -- Allow users to update their own subscription OR Super Admin can update any
  (user_id = auth.uid()) OR
  (email = auth.email()) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  ))
);

-- Allow Super Admin to insert any subscription
DROP POLICY IF EXISTS "insert_subscription_safe" ON public.subscribers;

CREATE POLICY "insert_subscription_super_admin_safe" ON public.subscribers
FOR INSERT
WITH CHECK (
  -- Allow users to insert their own subscription OR Super Admin can insert any
  (user_id = auth.uid()) OR
  (email = auth.email()) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  ))
);

-- Allow Super Admin to view all user data for debugging
-- Meals
CREATE POLICY "Super Admin can view all meals" ON public.meals
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  ))
);

-- Workouts  
CREATE POLICY "Super Admin can view all workouts" ON public.workouts
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  ))
);

-- Weight History
CREATE POLICY "Super Admin can view all weight history" ON public.weight_history
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  ))
);

-- Sleep Tracking
CREATE POLICY "Super Admin can view all sleep data" ON public.sleep_tracking
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  ))
);

-- User Points
CREATE POLICY "Super Admin can view all user points" ON public.user_points
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  ))
);

-- Body Measurements
CREATE POLICY "Super Admin can view all body measurements" ON public.body_measurements
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  ))
);

-- User Trials
CREATE POLICY "Super Admin can view all user trials" ON public.user_trials
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  (EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  ))
);