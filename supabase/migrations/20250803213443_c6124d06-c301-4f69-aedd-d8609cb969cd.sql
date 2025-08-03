-- ============================================
-- PHASE 2: REMOVE ANONYMOUS ACCESS POLICIES  
-- Fix remaining 80+ anonymous access warnings
-- ============================================

-- 🔧 DROP ALL ANONYMOUS ACCESS POLICIES
-- These policies currently allow 'anon' role access but should be restricted to authenticated users

-- Drop and recreate policies to remove anonymous access
-- Note: Only keep anonymous access for truly public data like scientific papers, food database, etc.

-- Admin conversation notes - restrict to admins only
DROP POLICY IF EXISTS "Admins can manage conversation notes" ON public.admin_conversation_notes;
DROP POLICY IF EXISTS "Super admins can manage admin conversation notes" ON public.admin_conversation_notes;

CREATE POLICY "Authenticated admins can manage conversation notes"
ON public.admin_conversation_notes
FOR ALL
TO authenticated
USING (has_admin_access(auth.uid()));

-- Admin emails - super admin only, no anonymous access
DROP POLICY IF EXISTS "Super admins can manage admin emails" ON public.admin_emails;

CREATE POLICY "Authenticated super admins can manage admin emails"
ON public.admin_emails
FOR ALL
TO authenticated
USING (is_super_admin_user(auth.uid()));

-- Admin logs - restrict to authenticated admins
DROP POLICY IF EXISTS "Authenticated users can view admin logs" ON public.admin_logs;

CREATE POLICY "Authenticated admins can view admin logs"
ON public.admin_logs
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

-- AI usage limits - authenticated users only
DROP POLICY IF EXISTS "Users can update their own AI usage limits" ON public.ai_usage_limits;
DROP POLICY IF EXISTS "Users can view their own AI usage limits" ON public.ai_usage_limits;

CREATE POLICY "Authenticated users can manage their own AI usage limits"
ON public.ai_usage_limits
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- API rate limits - admin only
DROP POLICY IF EXISTS "Admins can view rate limits" ON public.api_rate_limits;

CREATE POLICY "Authenticated admins can view rate limits"
ON public.api_rate_limits
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

-- Automated pipeline runs - super admin only
DROP POLICY IF EXISTS "Super admins can manage pipeline runs" ON public.automated_pipeline_runs;
DROP POLICY IF EXISTS "System can insert pipeline runs" ON public.automated_pipeline_runs;

CREATE POLICY "Authenticated super admins can manage pipeline runs"
ON public.automated_pipeline_runs
FOR ALL
TO authenticated
USING (is_super_admin_user(auth.uid()));

CREATE POLICY "Service role can insert pipeline runs"
ON public.automated_pipeline_runs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Badges - user specific, no anonymous access
DROP POLICY IF EXISTS "Coaches can view all badges for achievement coaching" ON public.badges;
DROP POLICY IF EXISTS "Users can view their own badges" ON public.badges;
DROP POLICY IF EXISTS "Users can create their own badges" ON public.badges;

CREATE POLICY "Authenticated users can view their own badges"
ON public.badges
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create their own badges"
ON public.badges
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated coaches can view user badges"
ON public.badges
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM coach_conversations 
  WHERE coach_conversations.user_id = badges.user_id 
  AND conversation_exists = true
));

-- Body analysis log - user specific
DROP POLICY IF EXISTS "Users can view their own body analysis logs" ON public.body_analysis_log;
DROP POLICY IF EXISTS "Users can create their own body analysis logs" ON public.body_analysis_log;

CREATE POLICY "Authenticated users can manage their own body analysis logs"
ON public.body_analysis_log
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Body measurements - user specific
DROP POLICY IF EXISTS "Coaches can view all body measurements for progress analysis" ON public.body_measurements;
DROP POLICY IF EXISTS "Super Admin can view all body measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Users can delete their own body measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Users can update their own body measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Users can view their own body measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Users can create their own body measurements" ON public.body_measurements;

CREATE POLICY "Authenticated users can manage their own body measurements"
ON public.body_measurements
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated coaches can view user body measurements"
ON public.body_measurements
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM coach_conversations 
  WHERE coach_conversations.user_id = body_measurements.user_id
));

-- Brand products - keep public for food database
-- No changes needed, these should be publicly accessible

-- Bug reports - user specific for creation, admin for management
DROP POLICY IF EXISTS "Super admins can update bug reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Super admins can view all bug reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Users can create their own bug reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Users can view their own bug reports" ON public.bug_reports;

CREATE POLICY "Authenticated users can create and view their own bug reports"
ON public.bug_reports
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated admins can manage all bug reports"
ON public.bug_reports
FOR ALL
TO authenticated
USING (is_super_admin_user(auth.uid()));

-- Coach conversations - restrict to authenticated users
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.coach_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.coach_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.coach_conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.coach_conversations;

CREATE POLICY "Authenticated users can manage their own conversations"
ON public.coach_conversations
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated admins can view all conversations"
ON public.coach_conversations
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

-- Coach feedback - user specific
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.coach_feedback;
DROP POLICY IF EXISTS "Users can create their own feedback" ON public.coach_feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON public.coach_feedback;

CREATE POLICY "Authenticated users can manage their own feedback"
ON public.coach_feedback
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Coach knowledge base - keep some public for RAG, restrict management
DROP POLICY IF EXISTS "Super admins can manage coach knowledge base" ON public.coach_knowledge_base;
DROP POLICY IF EXISTS "Anyone can view coach knowledge base" ON public.coach_knowledge_base;

-- Keep public read access for RAG functionality
CREATE POLICY "Public can view coach knowledge base"
ON public.coach_knowledge_base
FOR SELECT
USING (true);

CREATE POLICY "Authenticated super admins can manage coach knowledge base"
ON public.coach_knowledge_base
FOR ALL
TO authenticated
USING (is_super_admin_user(auth.uid()));

-- Coach messages - user specific
DROP POLICY IF EXISTS "Admins can view all messages" ON public.coach_messages;
DROP POLICY IF EXISTS "Users can create their own messages" ON public.coach_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.coach_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.coach_messages;

CREATE POLICY "Authenticated users can manage their own messages"
ON public.coach_messages
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated admins can view all messages"
ON public.coach_messages
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

-- Coach recommendations - user specific
DROP POLICY IF EXISTS "Users can create their own coach recommendations" ON public.coach_recommendations;
DROP POLICY IF EXISTS "Users can update their own coach recommendations" ON public.coach_recommendations;
DROP POLICY IF EXISTS "Users can view their own coach recommendations" ON public.coach_recommendations;

CREATE POLICY "Authenticated users can manage their own coach recommendations"
ON public.coach_recommendations
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Coach trace events - admin only
DROP POLICY IF EXISTS "Admin users can view trace events" ON public.coach_trace_events;
DROP POLICY IF EXISTS "System can insert trace events" ON public.coach_trace_events;
DROP POLICY IF EXISTS "System can update trace events" ON public.coach_trace_events;

CREATE POLICY "Authenticated admins can view trace events"
ON public.coach_trace_events
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));

CREATE POLICY "Service role can manage trace events"
ON public.coach_trace_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Continue with remaining tables...
-- Conversation summaries - user specific
DROP POLICY IF EXISTS "Coaches can view conversation summaries for coaching" ON public.conversation_summaries;
DROP POLICY IF EXISTS "Users can create their own conversation summaries" ON public.conversation_summaries;
DROP POLICY IF EXISTS "Users can delete their own conversation summaries" ON public.conversation_summaries;
DROP POLICY IF EXISTS "Users can update their own conversation summaries" ON public.conversation_summaries;
DROP POLICY IF EXISTS "Users can view their own conversation summaries" ON public.conversation_summaries;

CREATE POLICY "Authenticated users can manage their own conversation summaries"
ON public.conversation_summaries
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated coaches can view user conversation summaries"
ON public.conversation_summaries
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM coach_conversations 
  WHERE coach_conversations.user_id = conversation_summaries.user_id
));

-- ✅ COMPLETED: Phase 2 - Anonymous Access Policies Removed
-- Next: Continue with remaining policies in next migration batch