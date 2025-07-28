-- Fix RLS policy for user_fluids table
-- Drop existing faulty policy
DROP POLICY IF EXISTS "Users can create their own fluid intake" ON public.user_fluids;

-- Create corrected policy
CREATE POLICY "Users can create their own fluid intake" 
ON public.user_fluids 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);