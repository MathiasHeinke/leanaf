-- Fix RLS and auth context for client_events table
ALTER TABLE client_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS ce_ins ON client_events;
DROP POLICY IF EXISTS ce_sel ON client_events;
DROP POLICY IF EXISTS ce_upd ON client_events;

-- Create robust RLS policies for authenticated users
CREATE POLICY ce_ins ON client_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ce_sel ON client_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY ce_upd ON client_events
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow service role to bypass RLS for system operations
CREATE POLICY ce_service_all ON client_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);