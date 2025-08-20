-- Add ares_trace_steps table for detailed step tracking
CREATE TABLE IF NOT EXISTS public.ares_trace_steps (
  id BIGSERIAL PRIMARY KEY,
  trace_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  stage TEXT NOT NULL,
  data JSONB,
  ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_ares_trace_steps_trace_id ON public.ares_trace_steps(trace_id);
CREATE INDEX IF NOT EXISTS idx_ares_trace_steps_user_ts ON public.ares_trace_steps(user_id, ts DESC);

-- RLS Policy - deny all direct access (only via edge functions)
ALTER TABLE public.ares_trace_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_trace_steps" ON public.ares_trace_steps
  FOR ALL USING (false);

-- Add initial ARES feature flags for core team
INSERT INTO public.ares_feature_flags (email, flag, enabled, role)
VALUES 
  ('office@mathiasheinke.de', 'ares.debug', true, 'admin'),
  ('office@mathiasheinke.de', 'ares.chat.beta', true, 'admin'),
  ('office@mathiasheinke.de', 'ares.telemetry', true, 'admin')
ON CONFLICT (email, flag) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  updated_at = now();