-- Drop all views that depend on orchestrator_traces
DROP VIEW IF EXISTS v_orchestrator_traces_recent CASCADE;
DROP VIEW IF EXISTS v_orchestrator_traces_open_errors CASCADE;
DROP VIEW IF EXISTS v_orchestrator_metrics_1h CASCADE;
DROP VIEW IF EXISTS v_orchestrator_metrics_24h CASCADE;

-- Now safely alter the table to the new debug schema
ALTER TABLE orchestrator_traces 
  ALTER COLUMN id TYPE text USING id::text;

-- Add all the debug columns
ALTER TABLE orchestrator_traces
  ADD COLUMN IF NOT EXISTS client_event_id text,
  ADD COLUMN IF NOT EXISTS request_payload jsonb,
  ADD COLUMN IF NOT EXISTS persona jsonb,
  ADD COLUMN IF NOT EXISTS rag_chunks jsonb,
  ADD COLUMN IF NOT EXISTS user_context jsonb,
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS llm_input jsonb,
  ADD COLUMN IF NOT EXISTS llm_output jsonb,
  ADD COLUMN IF NOT EXISTS meta jsonb;

-- Update status column to have proper default
ALTER TABLE orchestrator_traces ALTER COLUMN status SET DEFAULT 'started';

-- Ensure created_at column exists (rename timestamp if needed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orchestrator_traces' AND column_name = 'timestamp') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orchestrator_traces' AND column_name = 'created_at') THEN
    ALTER TABLE orchestrator_traces RENAME COLUMN timestamp TO created_at;
  END IF;
END$$;

-- Set up RLS
ALTER TABLE orchestrator_traces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS traces_select ON orchestrator_traces;
CREATE POLICY traces_select
  ON orchestrator_traces FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS traces_insert ON orchestrator_traces;
CREATE POLICY traces_insert
  ON orchestrator_traces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS traces_update ON orchestrator_traces;
CREATE POLICY traces_update
  ON orchestrator_traces FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_traces_user_created ON orchestrator_traces(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_client_event ON orchestrator_traces(client_event_id);