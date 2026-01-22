-- ============================================
-- SECURITY CRITICAL FIXES MIGRATION
-- Date: 2026-01-22
-- Purpose: Fix critical security vulnerabilities
-- ============================================

-- ============================================
-- PART 1: FIX FUNCTIONS WITHOUT search_path
-- Prevents SQL injection through search_path manipulation
-- ============================================

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix handle_new_user function (critical for auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  is_admin BOOLEAN;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = user_uuid;
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE email = user_email AND role = 'super_admin'
  ) INTO is_admin;
  RETURN COALESCE(is_admin, FALSE);
END;
$$;

-- Fix is_enterprise_or_super_admin function
CREATE OR REPLACE FUNCTION public.is_enterprise_or_super_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  is_admin BOOLEAN;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = user_uuid;
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE email = user_email AND role IN ('super_admin', 'enterprise_admin')
  ) INTO is_admin;
  RETURN COALESCE(is_admin, FALSE);
END;
$$;

-- Fix is_super_admin_by_email function
CREATE OR REPLACE FUNCTION public.is_super_admin_by_email()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  user_email := auth.email();
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE email = user_email AND role = 'super_admin'
  );
END;
$$;

-- Fix check_ai_usage_limit function  
CREATE OR REPLACE FUNCTION public.check_ai_usage_limit(
  p_user_id UUID,
  p_feature_type TEXT,
  p_daily_limit INTEGER DEFAULT 5,
  p_monthly_limit INTEGER DEFAULT 150
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_count INTEGER;
  monthly_count INTEGER;
BEGIN
  -- Count daily usage
  SELECT COUNT(*) INTO daily_count
  FROM ai_usage_logs
  WHERE user_id = p_user_id
    AND feature_type = p_feature_type
    AND created_at >= CURRENT_DATE;
  
  -- Count monthly usage
  SELECT COUNT(*) INTO monthly_count
  FROM ai_usage_logs
  WHERE user_id = p_user_id
    AND feature_type = p_feature_type
    AND created_at >= date_trunc('month', CURRENT_DATE);
  
  RETURN daily_count < p_daily_limit AND monthly_count < p_monthly_limit;
END;
$$;

-- Fix has_admin_access function
CREATE OR REPLACE FUNCTION public.has_admin_access(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN is_super_admin(user_uuid) OR is_enterprise_or_super_admin(user_uuid);
END;
$$;

-- Fix is_super_admin_user function (if exists)
CREATE OR REPLACE FUNCTION public.is_super_admin_user(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN is_super_admin(user_uuid);
END;
$$;

-- ============================================
-- PART 2: ENSURE RLS IS ENABLED ON ALL USER TABLES
-- ============================================

-- Ensure RLS is enabled on critical tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weight_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coach_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 3: FIX REMAINING ANONYMOUS ACCESS ISSUES
-- ============================================

-- Fix subscribers table - ensure service_role can update for webhooks
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "select_subscription_safe_no_recursion" ON public.subscribers;
DROP POLICY IF EXISTS "update_subscription_safe_no_recursion" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription_no_recursion" ON public.subscribers;

-- Users can only view their own subscription
CREATE POLICY "subscribers_select_own"
ON public.subscribers
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR email = auth.email());

-- Users can update their own subscription
CREATE POLICY "subscribers_update_own"
ON public.subscribers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR email = auth.email());

-- Service role can manage all subscriptions (for webhooks)
CREATE POLICY "subscribers_service_role_all"
ON public.subscribers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can manage subscriptions
CREATE POLICY "subscribers_admin_all"
ON public.subscribers
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()))
WITH CHECK (has_admin_access(auth.uid()));

-- ============================================
-- PART 4: SECURE coach_memory TABLE
-- (Critical for AI context - contains user conversation data)
-- ============================================

DROP POLICY IF EXISTS "Users can view own memory" ON public.coach_memory;
DROP POLICY IF EXISTS "Users can insert own memory" ON public.coach_memory;
DROP POLICY IF EXISTS "Users can update own memory" ON public.coach_memory;
DROP POLICY IF EXISTS "Coaches can view user memory" ON public.coach_memory;

-- Only allow authenticated users to access their own memory
CREATE POLICY "coach_memory_user_select"
ON public.coach_memory
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "coach_memory_user_insert"
ON public.coach_memory
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "coach_memory_user_update"
ON public.coach_memory
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Service role full access for edge functions
CREATE POLICY "coach_memory_service_role"
ON public.coach_memory
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- PART 5: SECURE ares_traces TABLE  
-- (Contains AI interaction logs with user context)
-- ============================================

DROP POLICY IF EXISTS "Users can view own traces" ON public.ares_traces;
DROP POLICY IF EXISTS "Users can insert own traces" ON public.ares_traces;
DROP POLICY IF EXISTS "Service can manage traces" ON public.ares_traces;

-- Users can only view their own traces
CREATE POLICY "ares_traces_user_select"
ON public.ares_traces
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role full access for edge functions
CREATE POLICY "ares_traces_service_role"
ON public.ares_traces
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view all traces for debugging
CREATE POLICY "ares_traces_admin_select"
ON public.ares_traces
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

-- ============================================
-- PART 6: GRANT PROPER PERMISSIONS
-- ============================================

-- Revoke direct table access from anon role on sensitive tables
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.subscribers FROM anon;
REVOKE ALL ON public.coach_memory FROM anon;
REVOKE ALL ON public.ares_traces FROM anon;
REVOKE ALL ON public.ai_usage_logs FROM anon;
REVOKE ALL ON public.admin_users FROM anon;

-- Grant proper access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.subscribers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.coach_memory TO authenticated;
GRANT SELECT ON public.ares_traces TO authenticated;

-- Grant full access to service_role
GRANT ALL ON public.subscribers TO service_role;
GRANT ALL ON public.coach_memory TO service_role;
GRANT ALL ON public.ares_traces TO service_role;

-- ============================================
-- VERIFICATION COMMENTS
-- ============================================
-- After running this migration, verify:
-- 1. Run: SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles', 'subscribers', 'coach_memory', 'ares_traces');
-- 2. All should show rowsecurity = true
-- 3. Test as different users to confirm isolation
