-- Create ares_traces table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ares_traces (
  trace_id        text PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id        text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'started'
                  CHECK (status IN ('started','context_loaded','prompt_built','llm_called','completed','failed')),
  client_event_id text,
  input_text      text,
  images          jsonb,
  context         jsonb,
  persona         jsonb,
  rag_sources     jsonb,
  system_prompt   text,
  complete_prompt text,
  llm_input       jsonb,
  llm_output      jsonb,
  duration_ms     integer,
  error           jsonb
);

-- Enable RLS
ALTER TABLE public.ares_traces ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own traces
CREATE POLICY "ares_traces_select_owner"
  ON public.ares_traces
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS ares_traces_user_created
  ON public.ares_traces (user_id, created_at DESC);