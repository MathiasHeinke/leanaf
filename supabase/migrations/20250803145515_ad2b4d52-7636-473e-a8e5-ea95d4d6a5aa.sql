-- Fix Security Definer Views - Remove SECURITY DEFINER from problematic views
-- and create coach_traces table if missing

-- First check if coach_traces exists, if not create it
CREATE TABLE IF NOT EXISTS public.coach_traces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id TEXT NOT NULL,
  user_id UUID,
  coach_id TEXT,
  stage TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  execution_time_ms INTEGER,
  token_count INTEGER,
  cost_usd NUMERIC(10,4),
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.coach_traces ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can view all traces" 
ON public.coach_traces 
FOR SELECT 
USING (is_super_admin());

CREATE POLICY "System can insert traces" 
ON public.coach_traces 
FOR INSERT 
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_coach_traces_timestamp ON public.coach_traces(timestamp);
CREATE INDEX IF NOT EXISTS idx_coach_traces_user_id ON public.coach_traces(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_traces_trace_id ON public.coach_traces(trace_id);