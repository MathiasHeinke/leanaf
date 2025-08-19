-- Drop the view temporarily to allow column type change
DROP VIEW IF EXISTS v_orchestrator_traces_recent;

-- Now safely alter the table
ALTER TABLE orchestrator_traces 
  ALTER COLUMN id TYPE text USING id::text;

-- Add missing debug columns
ALTER TABLE orchestrator_traces
  ADD COLUMN IF NOT EXISTS client_event_id text,
  ADD COLUMN IF NOT EXISTS status text default 'started',
  ADD COLUMN IF NOT EXISTS request_payload jsonb,
  ADD COLUMN IF NOT EXISTS persona jsonb,
  ADD COLUMN IF NOT EXISTS rag_chunks jsonb,
  ADD COLUMN IF NOT EXISTS user_context jsonb,
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS llm_input jsonb,
  ADD COLUMN IF NOT EXISTS llm_output jsonb;

-- Recreate the view with text id
CREATE VIEW v_orchestrator_traces_recent AS
SELECT * FROM orchestrator_traces 
WHERE created_at >= now() - interval '24 hours'
ORDER BY created_at DESC;

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