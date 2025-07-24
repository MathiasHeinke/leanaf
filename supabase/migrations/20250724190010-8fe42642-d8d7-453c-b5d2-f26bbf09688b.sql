-- Check if the profiles table INSERT policy allows users to create their own profiles
-- This appears to be missing or incorrectly configured

-- First, let's ensure the profiles table has RLS enabled (it should already)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them correctly
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or Enterprise users can view all pro" ON public.profiles;

-- Create correct INSERT policy for profiles
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create correct UPDATE policy for profiles  
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create correct SELECT policy for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id OR is_enterprise_or_super_admin());

-- Also ensure weight_history table has proper RLS policies for loading current weight
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;

-- Check weight_history policies
DROP POLICY IF EXISTS "Users can view their own weight history" ON public.weight_history;
DROP POLICY IF EXISTS "Users can insert their own weight history" ON public.weight_history;
DROP POLICY IF EXISTS "Users can update their own weight history" ON public.weight_history;
DROP POLICY IF EXISTS "Users can delete their own weight history" ON public.weight_history;

-- Create proper weight_history policies
CREATE POLICY "Users can view their own weight history" 
ON public.weight_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight history" 
ON public.weight_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weight history" 
ON public.weight_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight history" 
ON public.weight_history 
FOR DELETE 
USING (auth.uid() = user_id);