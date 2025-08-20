-- Phase 1: Trace Schema
-- Create ares_traces table for unified tracing
CREATE TABLE IF NOT EXISTS public.ares_traces (
  trace_id        text PRIMARY KEY,
  user_id         uuid,
  coach_id        text,
  status          text DEFAULT 'started',
  started_at      timestamptz DEFAULT now(),
  completed_at    timestamptz,
  -- Debug fields
  persona         jsonb,
  rag_sources     jsonb,
  user_context    jsonb,
  prompt_system   text,
  prompt_messages jsonb,
  llm_input       jsonb,
  llm_output      jsonb,
  error_json      jsonb,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Trigger to keep updated_at fresh
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_ares_traces_updated_at'
  ) THEN
    CREATE TRIGGER set_ares_traces_updated_at
    BEFORE UPDATE ON public.ares_traces
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.ares_traces ENABLE ROW LEVEL SECURITY;

-- Select own traces policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'ares_traces' AND policyname = 'read_own_traces'
  ) THEN
    CREATE POLICY "read_own_traces" ON public.ares_traces
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Tighten grants: allow reads to authenticated, full to service_role
REVOKE ALL ON TABLE public.ares_traces FROM PUBLIC;
GRANT SELECT ON TABLE public.ares_traces TO authenticated;
GRANT ALL ON TABLE public.ares_traces TO service_role;
