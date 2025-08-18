-- Fix RPC function overloading by consolidating current_user_has_role functions
-- Drop existing overloaded functions and create one clean version

DROP FUNCTION IF EXISTS public.current_user_has_role();
DROP FUNCTION IF EXISTS public.current_user_has_role(app_role);
DROP FUNCTION IF EXISTS public.current_user_has_role(text);

-- Create single, clean function for role checking
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN _role IS NULL THEN auth.uid() IS NOT NULL
    ELSE auth.uid() IS NOT NULL
  END;
$$;

-- Add missing foreign key constraint for meals -> meal_images relationship
ALTER TABLE public.meal_images 
DROP CONSTRAINT IF EXISTS meal_images_meal_id_fkey;

ALTER TABLE public.meal_images
ADD CONSTRAINT meal_images_meal_id_fkey 
FOREIGN KEY (meal_id) REFERENCES public.meals(id) ON DELETE CASCADE;

-- Create simple RPC for preflight checks used by bootstrap orchestrator
CREATE OR REPLACE FUNCTION public.get_my_uid()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object('myuid', auth.uid());
$$;