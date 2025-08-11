-- Create shadow_state table for temporary meta-information
CREATE TABLE IF NOT EXISTS public.shadow_state (
  user_id UUID NOT NULL,
  trace_id TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, trace_id)
);

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_shadow_state_expires_at ON public.shadow_state (expires_at);

-- Enable RLS
ALTER TABLE public.shadow_state ENABLE ROW LEVEL SECURITY;

-- Create policies for shadow_state
CREATE POLICY "Users can manage their own shadow state" ON public.shadow_state
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can access all shadow state" ON public.shadow_state
  FOR ALL USING (current_setting('request.jwt.claims'::text, true)::jsonb ->> 'role' = 'service_role')
  WITH CHECK (current_setting('request.jwt.claims'::text, true)::jsonb ->> 'role' = 'service_role');