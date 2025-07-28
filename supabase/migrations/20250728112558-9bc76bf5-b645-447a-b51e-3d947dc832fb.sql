-- Coach-Zugriff auf Sleep Tracking (inklusive Libido-Werte) für ganzheitliche Gesundheitsberatung

CREATE POLICY "Coaches can view all sleep tracking data including libido values" ON public.sleep_tracking
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_conversations 
    WHERE coach_conversations.user_id = sleep_tracking.user_id
  )
  OR 
  -- System-Level Coach Access für Edge Functions
  current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
);