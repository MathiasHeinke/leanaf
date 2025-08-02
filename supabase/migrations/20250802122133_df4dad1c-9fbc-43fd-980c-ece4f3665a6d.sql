-- Add user_profile_events table for profile change history
CREATE TABLE IF NOT EXISTS public.user_profile_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_delta JSONB NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'profile_update',
  ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_profile_events
ALTER TABLE public.user_profile_events ENABLE ROW LEVEL SECURITY;

-- Policies for user_profile_events
CREATE POLICY "Users can insert their own profile events"
  ON public.user_profile_events 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own profile events"
  ON public.user_profile_events 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view profile events for coaching"
  ON public.user_profile_events 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_conversations 
      WHERE coach_conversations.user_id = user_profile_events.user_id
    ) OR 
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_profile_events_user_id_ts 
  ON public.user_profile_events(user_id, ts DESC);