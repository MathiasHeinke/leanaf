-- ============================================
-- PHASE 2 (FIXED): REMOVE ANONYMOUS ACCESS POLICIES  
-- Fix remaining 80+ anonymous access warnings
-- ============================================

-- 🔧 FIX REMAINING ANONYMOUS ACCESS POLICIES
-- Focus on major tables with anonymous access issues

-- Daily summaries - user specific
DROP POLICY IF EXISTS "Coaches can view summaries for coaching" ON public.daily_summaries;
DROP POLICY IF EXISTS "Users can create their own daily summaries" ON public.daily_summaries;
DROP POLICY IF EXISTS "Users can update their own daily summaries" ON public.daily_summaries;
DROP POLICY IF EXISTS "Users can view their own daily summaries" ON public.daily_summaries;

CREATE POLICY "Authenticated users can manage their own daily summaries"
ON public.daily_summaries
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated coaches can view user daily summaries"
ON public.daily_summaries
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM coach_conversations 
  WHERE coach_conversations.user_id = daily_summaries.user_id
));

-- Diary entries - user specific  
DROP POLICY IF EXISTS "Users can create their own diary entries" ON public.diary_entries;
DROP POLICY IF EXISTS "Users can delete their own diary entries" ON public.diary_entries;
DROP POLICY IF EXISTS "Users can update their own diary entries" ON public.diary_entries;
DROP POLICY IF EXISTS "Users can view their own diary entries" ON public.diary_entries;

CREATE POLICY "Authenticated users can manage their own diary entries"
ON public.diary_entries
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Email logs - admin and user access
DROP POLICY IF EXISTS "Admins can view all email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Marketing users can view email logs" ON public.email_logs;
DROP POLICY IF EXISTS "System can insert email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Users can view their email logs" ON public.email_logs;

CREATE POLICY "Authenticated users can view their own email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated admins can view all email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

CREATE POLICY "Service role can insert email logs"
ON public.email_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Exercise sessions - user specific
DROP POLICY IF EXISTS "Coaches can view all exercise sessions for detailed analysis" ON public.exercise_sessions;
DROP POLICY IF EXISTS "Users can create their own exercise sessions" ON public.exercise_sessions;
DROP POLICY IF EXISTS "Users can delete their own exercise sessions" ON public.exercise_sessions;
DROP POLICY IF EXISTS "Users can update their own exercise sessions" ON public.exercise_sessions;
DROP POLICY IF EXISTS "Users can view their own exercise sessions" ON public.exercise_sessions;

CREATE POLICY "Authenticated users can manage their own exercise sessions"
ON public.exercise_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated coaches can view user exercise sessions"
ON public.exercise_sessions
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM coach_conversations 
  WHERE coach_conversations.user_id = exercise_sessions.user_id
));

-- Exercise sets - user specific
DROP POLICY IF EXISTS "Coaches can view all exercise sets for detailed analysis" ON public.exercise_sets;
DROP POLICY IF EXISTS "Users can create their own exercise sets" ON public.exercise_sets;
DROP POLICY IF EXISTS "Users can delete their own exercise sets" ON public.exercise_sets;
DROP POLICY IF EXISTS "Users can update their own exercise sets" ON public.exercise_sets;
DROP POLICY IF EXISTS "Users can view their own exercise sets" ON public.exercise_sets;

CREATE POLICY "Authenticated users can manage their own exercise sets"
ON public.exercise_sets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated coaches can view user exercise sets"
ON public.exercise_sets
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM coach_conversations 
  WHERE coach_conversations.user_id = exercise_sets.user_id
));

-- Feature requests - public view, authenticated creation
DROP POLICY IF EXISTS "Anyone can view feature requests" ON public.feature_requests;
DROP POLICY IF EXISTS "Users can create feature requests" ON public.feature_requests;
DROP POLICY IF EXISTS "Super admins can update feature requests" ON public.feature_requests;

-- Keep public read access for community features
CREATE POLICY "Public can view feature requests"
ON public.feature_requests
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create feature requests"
ON public.feature_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated admins can manage feature requests"
ON public.feature_requests
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()));

-- Feature votes - public view, authenticated voting
DROP POLICY IF EXISTS "Anyone can view feature votes" ON public.feature_votes;
DROP POLICY IF EXISTS "Users can create their own votes" ON public.feature_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.feature_votes;

-- Keep public read for community voting
CREATE POLICY "Public can view feature votes"
ON public.feature_votes
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage their own votes"
ON public.feature_votes
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Food database - keep public for food search
-- No changes needed, should stay public

-- Food embeddings - public read, admin management
DROP POLICY IF EXISTS "Anyone can view food embeddings" ON public.food_embeddings;
DROP POLICY IF EXISTS "Super admins can manage food embeddings" ON public.food_embeddings;

CREATE POLICY "Public can view food embeddings"
ON public.food_embeddings
FOR SELECT
USING (true);

CREATE POLICY "Authenticated super admins can manage food embeddings"
ON public.food_embeddings
FOR ALL
TO authenticated
USING (is_super_admin_user(auth.uid()));

-- Knowledge base embeddings - public read for RAG
DROP POLICY IF EXISTS "Anyone can view knowledge embeddings" ON public.knowledge_base_embeddings;
DROP POLICY IF EXISTS "Super admins can manage knowledge embeddings" ON public.knowledge_base_embeddings;

CREATE POLICY "Public can view knowledge embeddings"
ON public.knowledge_base_embeddings
FOR SELECT
USING (true);

CREATE POLICY "Authenticated super admins can manage knowledge embeddings"
ON public.knowledge_base_embeddings
FOR ALL
TO authenticated
USING (is_super_admin_user(auth.uid()));

-- Meals - user specific
DROP POLICY IF EXISTS "Coaches can view all meals for detailed nutrition analysis" ON public.meals;
DROP POLICY IF EXISTS "Super Admin can view all meals" ON public.meals;
DROP POLICY IF EXISTS "Users can create their own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can delete their own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can update their own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can view their own meals" ON public.meals;

CREATE POLICY "Authenticated users can manage their own meals"
ON public.meals
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated coaches can view user meals"
ON public.meals
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM coach_conversations 
  WHERE coach_conversations.user_id = meals.user_id
));

-- Monthly challenges - user specific
DROP POLICY IF EXISTS "Users can create their own challenges" ON public.monthly_challenges;
DROP POLICY IF EXISTS "Users can delete their own challenges" ON public.monthly_challenges;
DROP POLICY IF EXISTS "Users can update their own challenges" ON public.monthly_challenges;
DROP POLICY IF EXISTS "Users can view their own challenges" ON public.monthly_challenges;

CREATE POLICY "Authenticated users can manage their own challenges"
ON public.monthly_challenges
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Profiles - user specific
DROP POLICY IF EXISTS "Coaches can view all profiles for coaching" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can manage their own profile"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated coaches can view user profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM coach_conversations 
  WHERE coach_conversations.user_id = profiles.user_id
) OR is_enterprise_or_super_admin(auth.uid()));

-- User points - user specific
DROP POLICY IF EXISTS "Coaches can view all user points for gamification coaching" ON public.user_points;
DROP POLICY IF EXISTS "Super Admin can view all user points" ON public.user_points;
DROP POLICY IF EXISTS "Users can insert their own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can update their own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;

CREATE POLICY "Authenticated users can manage their own points"
ON public.user_points
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated coaches can view user points"
ON public.user_points
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM coach_conversations 
  WHERE coach_conversations.user_id = user_points.user_id
) OR is_super_admin_user(auth.uid()));

-- Workouts - user specific
DROP POLICY IF EXISTS "Coaches can view all workouts for training coaching" ON public.workouts;
DROP POLICY IF EXISTS "Super Admin can view all workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can create their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update their own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can view their own workouts" ON public.workouts;

CREATE POLICY "Authenticated users can manage their own workouts"
ON public.workouts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated coaches can view user workouts"
ON public.workouts
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM coach_conversations 
  WHERE coach_conversations.user_id = workouts.user_id
) OR is_super_admin_user(auth.uid()));

-- ✅ COMPLETED: Major anonymous access policies fixed
-- Expected: Significant reduction in anonymous access warnings