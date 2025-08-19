-- Create coach_runtime_state table for Name-Resolver and other runtime state
CREATE TABLE IF NOT EXISTS public.coach_runtime_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  coach_id TEXT NOT NULL DEFAULT 'ares',
  state_key TEXT NOT NULL,
  state_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, coach_id, state_key)
);

-- Enable RLS
ALTER TABLE public.coach_runtime_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own runtime state"
  ON public.coach_runtime_state
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view runtime state for coaching"
  ON public.coach_runtime_state
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_conversations 
      WHERE coach_conversations.user_id = coach_runtime_state.user_id
    ) OR 
    ((current_setting('request.jwt.claims', true))::jsonb ->> 'role') = 'service_role'
  );

-- Add updated_at trigger
CREATE TRIGGER set_coach_runtime_state_updated_at
  BEFORE UPDATE ON public.coach_runtime_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();