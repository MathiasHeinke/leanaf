-- Create coach_traces table for request tracing
CREATE TABLE public.coach_traces (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trace_id TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  stage TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb
);

-- Create index for fast trace_id lookups
CREATE INDEX idx_coach_traces_trace_id ON public.coach_traces(trace_id);
CREATE INDEX idx_coach_traces_ts ON public.coach_traces(ts);

-- Enable RLS
ALTER TABLE public.coach_traces ENABLE ROW LEVEL SECURITY;

-- Allow system to insert traces
CREATE POLICY "System can insert traces" 
ON public.coach_traces 
FOR INSERT 
WITH CHECK (true);

-- Super admins can view all traces for debugging
CREATE POLICY "Super admins can view traces" 
ON public.coach_traces 
FOR SELECT 
USING (is_super_admin());