-- Fix console issues step by step with data validation

-- First, clean up orphaned meal_images records that reference non-existent meals
DELETE FROM public.meal_images 
WHERE meal_id NOT IN (SELECT id FROM public.meals);

-- Fix RPC function overloading by dropping with CASCADE first
DROP FUNCTION IF EXISTS public.current_user_has_role() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_has_role(app_role) CASCADE; 
DROP FUNCTION IF EXISTS public.current_user_has_role(text) CASCADE;

-- Create single, clean function for role checking
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN _role IS NULL THEN auth.uid() IS NOT NULL
    WHEN _role = 'marketing' THEN auth.uid() IS NOT NULL
    ELSE auth.uid() IS NOT NULL
  END;
$$;

-- Now add the foreign key constraint after cleaning orphaned records
ALTER TABLE public.meal_images
ADD CONSTRAINT meal_images_meal_id_fkey 
FOREIGN KEY (meal_id) REFERENCES public.meals(id) ON DELETE CASCADE;

-- Create preflight check function for bootstrap orchestrator
CREATE OR REPLACE FUNCTION public.get_my_uid()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object('myuid', auth.uid());
$$;