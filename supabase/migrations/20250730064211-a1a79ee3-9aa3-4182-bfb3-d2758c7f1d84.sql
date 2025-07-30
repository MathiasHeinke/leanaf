-- Add missing Coach policy for weight_history table
CREATE POLICY "Coaches can view all weight history for progress analysis" 
ON public.weight_history
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = weight_history.user_id
  ) OR 
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);