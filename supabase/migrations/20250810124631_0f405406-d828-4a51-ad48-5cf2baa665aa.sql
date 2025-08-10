-- Create unmet_tool_events table for orchestrator logging
CREATE TABLE IF NOT EXISTS public.unmet_tool_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT,
  message TEXT NOT NULL,
  intent_guess TEXT,
  confidence NUMERIC,
  suggested_tool TEXT,
  handled_manually BOOLEAN DEFAULT false,
  manual_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unmet_tool_events ENABLE ROW LEVEL SECURITY;

-- Policies: users can insert/select their own events
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'unmet_tool_events' AND policyname = 'Users can insert their own unmet tool events'
  ) THEN
    CREATE POLICY "Users can insert their own unmet tool events"
    ON public.unmet_tool_events
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'unmet_tool_events' AND policyname = 'Users can view their own unmet tool events'
  ) THEN
    CREATE POLICY "Users can view their own unmet tool events"
    ON public.unmet_tool_events
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Optional: index for analytics
CREATE INDEX IF NOT EXISTS idx_unmet_tool_events_user_created ON public.unmet_tool_events(user_id, created_at DESC);
