-- Fix infinite recursion in RLS policies by creating security definer functions

-- Create security definer function to check Super Admin status
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = user_uuid 
    AND subscription_tier = 'Super Admin'
    AND subscribed = true
  );
$$;

-- Create security definer function to check Enterprise or Super Admin status
CREATE OR REPLACE FUNCTION public.is_enterprise_or_super_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = user_uuid 
    AND subscription_tier IN ('Enterprise', 'Super Admin')
    AND subscribed = true
  );
$$;

-- Now recreate all policies using the security definer functions

-- Fix subscribers table policies (remove recursion)
DROP POLICY IF EXISTS "select_subscription_super_admin_safe" ON public.subscribers;
DROP POLICY IF EXISTS "update_subscription_super_admin_safe" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription_super_admin_safe" ON public.subscribers;

CREATE POLICY "select_subscription_safe_no_recursion" ON public.subscribers
FOR SELECT  
USING (
  (user_id = auth.uid()) OR 
  (email = auth.email())
);

CREATE POLICY "update_subscription_safe_no_recursion" ON public.subscribers  
FOR UPDATE
USING (
  (user_id = auth.uid()) OR
  (email = auth.email())
);

CREATE POLICY "insert_subscription_safe_no_recursion" ON public.subscribers
FOR INSERT
WITH CHECK (
  (user_id = auth.uid()) OR
  (email = auth.email())
);

-- Fix profiles table policy
DROP POLICY IF EXISTS "Users can view own profile or Super Admin can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or Enterprise users can view all profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  (auth.uid() = user_id) OR
  public.is_enterprise_or_super_admin()
);

-- Fix all other table policies using the security definer function
DROP POLICY IF EXISTS "Super Admin can view all meals" ON public.meals;
CREATE POLICY "Super Admin can view all meals" ON public.meals
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  public.is_super_admin()
);

DROP POLICY IF EXISTS "Super Admin can view all workouts" ON public.workouts;
CREATE POLICY "Super Admin can view all workouts" ON public.workouts
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  public.is_super_admin()
);

DROP POLICY IF EXISTS "Super Admin can view all weight history" ON public.weight_history;
CREATE POLICY "Super Admin can view all weight history" ON public.weight_history
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  public.is_super_admin()
);

DROP POLICY IF EXISTS "Super Admin can view all sleep data" ON public.sleep_tracking;
CREATE POLICY "Super Admin can view all sleep data" ON public.sleep_tracking
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  public.is_super_admin()
);

DROP POLICY IF EXISTS "Super Admin can view all user points" ON public.user_points;
CREATE POLICY "Super Admin can view all user points" ON public.user_points
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  public.is_super_admin()
);

DROP POLICY IF EXISTS "Super Admin can view all body measurements" ON public.body_measurements;
CREATE POLICY "Super Admin can view all body measurements" ON public.body_measurements
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  public.is_super_admin()
);

DROP POLICY IF EXISTS "Super Admin can view all user trials" ON public.user_trials;
CREATE POLICY "Super Admin can view all user trials" ON public.user_trials
FOR SELECT 
USING (
  (auth.uid() = user_id) OR
  public.is_super_admin()
);