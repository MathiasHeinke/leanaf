-- Migration: Fix ares_traces table for complete tracing
-- Date: 2026-01-22
-- Description: Ensures ares_traces table has all required columns for full LLM tracing

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add user_context column (stores full user context as JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'user_context') THEN
        ALTER TABLE ares_traces ADD COLUMN user_context JSONB;
    END IF;

    -- Add llm_input column (stores the input sent to LLM)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'llm_input') THEN
        ALTER TABLE ares_traces ADD COLUMN llm_input JSONB;
    END IF;

    -- Add llm_output column (stores the LLM response)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'llm_output') THEN
        ALTER TABLE ares_traces ADD COLUMN llm_output TEXT;
    END IF;

    -- Add tool_calls column (stores function calling results)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'tool_calls') THEN
        ALTER TABLE ares_traces ADD COLUMN tool_calls JSONB;
    END IF;

    -- Add system_prompt column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'system_prompt') THEN
        ALTER TABLE ares_traces ADD COLUMN system_prompt TEXT;
    END IF;

    -- Add complete_prompt column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'complete_prompt') THEN
        ALTER TABLE ares_traces ADD COLUMN complete_prompt TEXT;
    END IF;

    -- Add persona column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'persona') THEN
        ALTER TABLE ares_traces ADD COLUMN persona JSONB;
    END IF;

    -- Add rag_sources column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'rag_sources') THEN
        ALTER TABLE ares_traces ADD COLUMN rag_sources JSONB;
    END IF;

    -- Add error column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'error') THEN
        ALTER TABLE ares_traces ADD COLUMN error JSONB;
    END IF;

    -- Add duration_ms column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'duration_ms') THEN
        ALTER TABLE ares_traces ADD COLUMN duration_ms INTEGER;
    END IF;

    -- Add images column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'images') THEN
        ALTER TABLE ares_traces ADD COLUMN images JSONB;
    END IF;

    -- Add input_text column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'input_text') THEN
        ALTER TABLE ares_traces ADD COLUMN input_text TEXT;
    END IF;

    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'status') THEN
        ALTER TABLE ares_traces ADD COLUMN status VARCHAR(50) DEFAULT 'received';
    END IF;

    -- Add timestamps
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'created_at') THEN
        ALTER TABLE ares_traces ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ares_traces' AND column_name = 'updated_at') THEN
        ALTER TABLE ares_traces ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create index for faster trace lookups
CREATE INDEX IF NOT EXISTS idx_ares_traces_user_id ON ares_traces(user_id);
CREATE INDEX IF NOT EXISTS idx_ares_traces_trace_id ON ares_traces(trace_id);
CREATE INDEX IF NOT EXISTS idx_ares_traces_created_at ON ares_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ares_traces_status ON ares_traces(status);

-- Grant service role full access
GRANT ALL ON ares_traces TO service_role;

-- Comment on table
COMMENT ON TABLE ares_traces IS 'Stores complete ARES LLM interaction traces for debugging and analysis';
