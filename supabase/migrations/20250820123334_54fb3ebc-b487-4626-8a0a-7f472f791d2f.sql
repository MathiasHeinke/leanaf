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

-- Add initial ARES feature flags for core team (simple insert, ignoring conflicts)
INSERT INTO public.ares_feature_flags (email, flag, enabled, role)
SELECT 'office@mathiasheinke.de', 'ares.debug', true, 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.ares_feature_flags 
  WHERE email = 'office@mathiasheinke.de' AND flag = 'ares.debug'
);

INSERT INTO public.ares_feature_flags (email, flag, enabled, role)
SELECT 'office@mathiasheinke.de', 'ares.chat.beta', true, 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.ares_feature_flags 
  WHERE email = 'office@mathiasheinke.de' AND flag = 'ares.chat.beta'
);

INSERT INTO public.ares_feature_flags (email, flag, enabled, role)
SELECT 'office@mathiasheinke.de', 'ares.telemetry', true, 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.ares_feature_flags 
  WHERE email = 'office@mathiasheinke.de' AND flag = 'ares.telemetry'
);