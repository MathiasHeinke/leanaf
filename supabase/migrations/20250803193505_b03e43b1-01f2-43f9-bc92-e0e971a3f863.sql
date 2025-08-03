-- Fix RLS policy for coach_trace_events to allow admin panel access
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins can view all trace events" ON public.coach_trace_events;

-- Create broader policy for authenticated admin users
CREATE POLICY "Admin users can view trace events" 
ON public.coach_trace_events 
FOR SELECT 
USING (
  -- Allow super admins
  is_super_admin(auth.uid()) 
  OR 
  -- Allow users with admin role
  has_admin_access(auth.uid())
  OR
  -- Allow users with admin email
  is_admin_by_email()
  OR
  -- Allow service role for system operations
  ((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role'::text
);