-- Fix RLS policies for coach memory and conversations to allow service role access
-- This prevents the "Load failed" errors we're seeing in the logs

-- Update coach_memory RLS policy to allow service role
DROP POLICY IF EXISTS "Users can create their own coach memory" ON coach_memory;
DROP POLICY IF EXISTS "Users can update their own coach memory" ON coach_memory;
DROP POLICY IF EXISTS "Users can view their own coach memory" ON coach_memory;

-- Recreate with service role access
CREATE POLICY "Users and service can access coach memory" ON coach_memory
  FOR ALL USING (
    auth.uid() = user_id OR 
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  )
  WITH CHECK (
    auth.uid() = user_id OR 
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Update coach_conversations RLS policy to allow service role
DROP POLICY IF EXISTS "Users can create their own coach conversations" ON coach_conversations;
DROP POLICY IF EXISTS "Users can update their own coach conversations" ON coach_conversations;
DROP POLICY IF EXISTS "Users can view their own coach conversations" ON coach_conversations;

-- Recreate with service role access
CREATE POLICY "Users and service can access coach conversations" ON coach_conversations
  FOR ALL USING (
    auth.uid() = user_id OR 
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  )
  WITH CHECK (
    auth.uid() = user_id OR 
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );