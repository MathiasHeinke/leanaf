-- Fix Security Definer Views and Function Search Paths
-- Drop and recreate problematic views with proper security

-- Fix ensure_daily_goals function search path
CREATE OR REPLACE FUNCTION public.ensure_daily_goals(user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_goals RECORD;
  profile_data RECORD;
  new_goals RECORD;
BEGIN
  -- Get existing goals (LIMIT 1 ensures single result)
  SELECT * INTO existing_goals
  FROM public.daily_goals 
  WHERE user_id = user_id_param 
  LIMIT 1;
  
  -- If goals exist, return them as JSON
  IF FOUND THEN
    RETURN row_to_json(existing_goals);
  END IF;
  
  -- Get profile data for defaults
  SELECT * INTO profile_data
  FROM public.profiles 
  WHERE user_id = user_id_param 
  LIMIT 1;
  
  -- Create new goals with defaults
  INSERT INTO public.daily_goals (
    user_id, 
    target_calories, 
    target_protein, 
    target_carbs, 
    target_fats,
    created_at,
    updated_at
  ) VALUES (
    user_id_param,
    COALESCE(profile_data.target_calories, 2000),
    COALESCE(profile_data.target_protein, 150),
    COALESCE(profile_data.target_carbs, 200),
    COALESCE(profile_data.target_fats, 80),
    now(),
    now()
  )
  RETURNING * INTO new_goals;
  
  -- Return new goals as JSON
  RETURN row_to_json(new_goals);
END;
$function$;

-- Fix get_my_uid function search path
CREATE OR REPLACE FUNCTION public.get_my_uid()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT auth.uid();
$function$;

-- Fix get_credits_status function search path
CREATE OR REPLACE FUNCTION public.get_credits_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Return fixed JSON for Lean AI
  RETURN json_build_object(
    'credits_remaining', 1000,
    'monthly_quota', 1000,
    'tester', false
  );
END;
$function$;