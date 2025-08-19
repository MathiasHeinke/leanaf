-- Create orchestrator_traces table for unified trace debugging
CREATE TABLE IF NOT EXISTS public.orchestrator_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  persona JSONB,
  rag_sources JSONB,
  user_context JSONB,
  assembled_prompt TEXT,
  llm_input JSONB,
  llm_output JSONB,
  meta JSONB
);

-- Enable RLS
ALTER TABLE public.orchestrator_traces ENABLE ROW LEVEL SECURITY;

-- RLS policies: Users can only see/modify their own traces
CREATE POLICY "traces_select_own"
  ON public.orchestrator_traces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "traces_insert_own"
  ON public.orchestrator_traces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "traces_update_own"
  ON public.orchestrator_traces FOR UPDATE
  USING (auth.uid() = user_id);