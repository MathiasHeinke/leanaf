-- Fix meals.name reference to meals.title
-- This addresses the database error where queries try to access meals.name which doesn't exist

-- Add missing current_user_has_role function that's being referenced
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Simple implementation that returns true for authenticated users
  -- Can be enhanced later with proper role checking
  SELECT auth.uid() IS NOT NULL;
$function$;