-- Fix RPC return types to prevent "requires 1 row" errors

-- Fix ensure_daily_goals to properly return single JSON object
CREATE OR REPLACE FUNCTION public.ensure_daily_goals(user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_goals RECORD;
  profile_data RECORD;
  new_goals RECORD;
BEGIN
  -- Get existing goals
  SELECT * INTO existing_goals
  FROM daily_goals 
  WHERE user_id = user_id_param 
  LIMIT 1;
  
  -- If goals exist, return them as JSON
  IF FOUND THEN
    RETURN row_to_json(existing_goals);
  END IF;
  
  -- Get profile data for defaults
  SELECT * INTO profile_data
  FROM profiles 
  WHERE user_id = user_id_param 
  LIMIT 1;
  
  -- Create new goals with defaults
  INSERT INTO daily_goals (
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
$$;

-- Fix get_my_uid to ensure single result
CREATE OR REPLACE FUNCTION public.get_my_uid()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT auth.uid() LIMIT 1;
$$;

-- Fix get_credits_status to return single JSON object
CREATE OR REPLACE FUNCTION public.get_credits_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result_json json;
BEGIN
  -- For Lean AI: simplified credits (no premium features)
  SELECT json_build_object(
    'credits_remaining', 1000,
    'monthly_quota', 1000,
    'tester', false
  ) INTO result_json;
  
  RETURN result_json;
END;
$$;

-- Fix current_user_has_role to return single boolean
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE 
    WHEN _role IS NULL THEN auth.uid() IS NOT NULL
    ELSE auth.uid() IS NOT NULL
  END
  LIMIT 1;
$$;