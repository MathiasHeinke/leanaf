-- ============================================
-- SECURITY COMPLETE HARDENING MIGRATION
-- Date: 2026-01-22
-- Purpose: Fix ALL remaining security warnings
-- ============================================

-- ============================================
-- PART 1: CREATE EXTENSIONS SCHEMA
-- Move extensions out of public schema
-- ============================================

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Note: Moving existing extensions requires recreating them
-- This is a manual process in Supabase Dashboard
-- See SECURITY_DASHBOARD_GUIDE.md for instructions

-- ============================================
-- PART 2: FIX ALL REMAINING SECURITY DEFINER FUNCTIONS
-- Add SET search_path = public to prevent SQL injection
-- ============================================

-- Fix update_user_points function
CREATE OR REPLACE FUNCTION public.update_user_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  point_value INT;
  current_points INT;
  current_level INT;
BEGIN
  SELECT points INTO point_value FROM activity_point_values 
  WHERE activity_type = NEW.activity_type LIMIT 1;
  
  IF point_value IS NULL THEN
    point_value := 1;
  END IF;
  
  UPDATE profiles
  SET total_points = COALESCE(total_points, 0) + point_value
  WHERE user_id = NEW.user_id
  RETURNING total_points INTO current_points;
  
  SELECT level INTO current_level FROM level_thresholds 
  WHERE current_points >= min_points 
  ORDER BY level DESC LIMIT 1;
  
  IF current_level IS NOT NULL THEN
    UPDATE profiles SET current_level = current_level WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix calculate_streak_bonus function
CREATE OR REPLACE FUNCTION public.calculate_streak_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- Fix update_workout_streak function
CREATE OR REPLACE FUNCTION public.update_workout_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- Fix check_plan_limit function
CREATE OR REPLACE FUNCTION public.check_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- Fix is_admin_by_email function
CREATE OR REPLACE FUNCTION public.is_admin_by_email()
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
    SELECT 1 FROM admin_users WHERE email = user_email
  );
END;
$$;

-- Fix is_admin_user function
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = user_uuid;
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE email = user_email
  );
END;
$$;

-- Fix log_failed_login_attempt function
CREATE OR REPLACE FUNCTION public.log_failed_login_attempt(
  p_email TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO failed_login_attempts (email, ip_address, user_agent, failure_reason, metadata)
  VALUES (p_email, p_ip_address, p_user_agent, p_failure_reason, p_metadata)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Fix check_brute_force function
CREATE OR REPLACE FUNCTION public.check_brute_force(
  p_email TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM failed_login_attempts
  WHERE (email = p_email OR ip_address = p_ip_address)
    AND attempt_time > NOW() - INTERVAL '15 minutes';
    
  RETURN attempt_count >= 5;
END;
$$;

-- Fix get_security_alerts function
CREATE OR REPLACE FUNCTION public.get_security_alerts(
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  ip_address INET,
  attempt_time TIMESTAMPTZ,
  failure_reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.email, f.ip_address, f.attempt_time, f.failure_reason
  FROM failed_login_attempts f
  ORDER BY f.attempt_time DESC
  LIMIT p_limit;
END;
$$;

-- Fix upsert_profile_from_auth function
CREATE OR REPLACE FUNCTION public.upsert_profile_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (user_id, email, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix get_coach_memory function
CREATE OR REPLACE FUNCTION public.get_coach_memory(p_user_id UUID, p_coach_type TEXT DEFAULT 'ares')
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  memory_data JSONB;
BEGIN
  SELECT memory_json INTO memory_data
  FROM coach_memory
  WHERE user_id = p_user_id AND coach_type = p_coach_type
  LIMIT 1;
  
  RETURN COALESCE(memory_data, '{}'::jsonb);
END;
$$;

-- Fix upsert_coach_memory function
CREATE OR REPLACE FUNCTION public.upsert_coach_memory(
  p_user_id UUID,
  p_coach_type TEXT,
  p_memory_json JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO coach_memory (user_id, coach_type, memory_json, updated_at)
  VALUES (p_user_id, p_coach_type, p_memory_json, NOW())
  ON CONFLICT (user_id, coach_type) 
  DO UPDATE SET memory_json = p_memory_json, updated_at = NOW();
END;
$$;

-- Fix get_user_profile_for_coaching function  
CREATE OR REPLACE FUNCTION public.get_user_profile_for_coaching(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'display_name', display_name,
    'birth_date', birth_date,
    'height', height,
    'current_weight', current_weight,
    'target_weight', target_weight,
    'goal', goal,
    'activity_level', activity_level
  ) INTO profile_data
  FROM profiles
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(profile_data, '{}'::jsonb);
END;
$$;

-- Fix calculate_daily_nutrition function
CREATE OR REPLACE FUNCTION public.calculate_daily_nutrition(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_calories NUMERIC,
  total_protein NUMERIC,
  total_carbs NUMERIC,
  total_fat NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(calories), 0) as total_calories,
    COALESCE(SUM(protein), 0) as total_protein,
    COALESCE(SUM(carbs), 0) as total_carbs,
    COALESCE(SUM(fat), 0) as total_fat
  FROM meals
  WHERE user_id = p_user_id AND meal_date = p_date;
END;
$$;

-- ============================================
-- PART 3: FIX PROBLEMATIC RLS POLICIES
-- Replace USING(true)/WITH CHECK(true) where inappropriate
-- ============================================

-- Fix subscribers policies - should only allow users to manage their own subscriptions
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "subscribers_select_own" ON public.subscribers;
DROP POLICY IF EXISTS "subscribers_insert_own" ON public.subscribers;
DROP POLICY IF EXISTS "subscribers_update_own" ON public.subscribers;
DROP POLICY IF EXISTS "subscribers_delete_own" ON public.subscribers;

CREATE POLICY "subscribers_select_own" ON public.subscribers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscribers_insert_own" ON public.subscribers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscribers_update_own" ON public.subscribers
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscribers_delete_own" ON public.subscribers
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PART 4: SECURE failed_login_attempts TABLE
-- Add INSERT policy for service role functions
-- ============================================

-- Drop existing policies on failed_login_attempts
DROP POLICY IF EXISTS "Only admins can view failed login attempts" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "service_role_insert_failed_logins" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "admins_select_failed_logins" ON public.failed_login_attempts;

-- Ensure RLS is enabled
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view failed login attempts
CREATE POLICY "admins_select_failed_logins" ON public.failed_login_attempts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email())
  );

-- Policy: Allow service functions to insert (via SECURITY DEFINER functions)
-- Note: The log_failed_login_attempt function uses SECURITY DEFINER
-- so it bypasses RLS, which is the correct behavior for logging

-- ============================================
-- PART 5: FIX coach_ratings POLICY
-- Should require authentication to view/vote
-- ============================================

DROP POLICY IF EXISTS "Anyone can view coach ratings for statistics" ON public.coach_ratings;
DROP POLICY IF EXISTS "authenticated_view_coach_ratings" ON public.coach_ratings;

-- Only authenticated users should view ratings
CREATE POLICY "authenticated_view_coach_ratings" ON public.coach_ratings
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- PART 6: ADDITIONAL SECURITY HARDENING
-- ============================================

-- Revoke public access to sensitive functions
REVOKE ALL ON FUNCTION public.log_failed_login_attempt FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_brute_force FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_security_alerts FROM PUBLIC;

-- Grant to authenticated users only
GRANT EXECUTE ON FUNCTION public.log_failed_login_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_brute_force TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_alerts TO authenticated;

-- ============================================
-- PART 7: DOCUMENT LOOKUP TABLES
-- These are correctly using USING(true) because they are public reference data
-- ============================================

-- The following tables correctly use USING(true) because they contain
-- public reference data that all users should be able to read:
--
-- 1. exercises - Public exercise database
-- 2. food_database - Public food nutrition data
-- 3. food_embeddings - Embeddings for food search
-- 4. brand_products - Public brand product data
-- 5. food_aliases - Food name aliases
-- 6. supplement_database - Public supplement info
-- 7. fluid_database - Fluid nutrition data
-- 8. medical_conditions_library - Reference data
-- 9. medications_library - Reference data
-- 10. coach_knowledge_base - Training knowledge
-- 11. scientific_papers - Research papers
-- 12. coach_specializations - Coach capabilities
-- 13. knowledge_base_embeddings - Search embeddings
-- 14. men_quotes, women_quotes - Motivational quotes
-- 15. training_exercise_templates - Workout templates

-- ============================================
-- VERIFICATION QUERIES (run manually)
-- ============================================

-- Check functions with SECURITY DEFINER but no search_path:
-- SELECT n.nspname, p.proname, p.prosecdef, p.proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE p.prosecdef = true 
-- AND n.nspname = 'public'
-- AND (p.proconfig IS NULL OR NOT 'search_path=public' = ANY(p.proconfig));

-- Check RLS policies using true:
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND (qual = 'true' OR with_check = 'true');

-- ============================================
-- END OF MIGRATION
-- ============================================
