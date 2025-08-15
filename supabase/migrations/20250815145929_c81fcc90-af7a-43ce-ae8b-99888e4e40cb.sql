-- Create missing functions for clean profile loading

-- Function to check user roles (simplified for Lean AI)
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- For Lean AI: simplified role check
  SELECT false; -- No roles needed for basic functionality
$$;

-- Function to get credits status (simplified for Lean AI)
CREATE OR REPLACE FUNCTION public.get_credits_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- For Lean AI: simplified credits (no premium features)
  RETURN jsonb_build_object(
    'credits_remaining', 1000,
    'monthly_quota', 1000,
    'tester', false
  );
END;
$$;