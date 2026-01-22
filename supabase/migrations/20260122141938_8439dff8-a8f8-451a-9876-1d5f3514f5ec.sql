-- 1. coach_memory: Add coach_id for multi-coach support
ALTER TABLE coach_memory ADD COLUMN IF NOT EXISTS coach_id text DEFAULT 'ares';
CREATE INDEX IF NOT EXISTS idx_coach_memory_user_coach ON coach_memory(user_id, coach_id);

-- 2. ares_traces: Rename context to user_context (as expected by trace.ts)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ares_traces' AND column_name = 'context') THEN
    ALTER TABLE ares_traces RENAME COLUMN context TO user_context;
  END IF;
END $$;

-- 3. ares_traces: Add updated_at and other missing columns
ALTER TABLE ares_traces ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE ares_traces ADD COLUMN IF NOT EXISTS complete_prompt text;
ALTER TABLE ares_traces ADD COLUMN IF NOT EXISTS llm_input jsonb;
ALTER TABLE ares_traces ADD COLUMN IF NOT EXISTS tool_calls jsonb;