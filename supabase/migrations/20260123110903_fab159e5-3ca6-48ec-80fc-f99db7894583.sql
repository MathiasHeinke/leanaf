-- 1. 'received' zum CHECK constraint hinzufügen
ALTER TABLE ares_traces 
DROP CONSTRAINT IF EXISTS ares_traces_status_check;

ALTER TABLE ares_traces 
ADD CONSTRAINT ares_traces_status_check 
CHECK (status IN ('received', 'started', 'context_loaded', 'prompt_built', 'llm_called', 'completed', 'failed'));

-- 2. Fehlende Spalten hinzufügen für insights/patterns tracking
ALTER TABLE ares_traces ADD COLUMN IF NOT EXISTS insights_loaded integer DEFAULT 0;
ALTER TABLE ares_traces ADD COLUMN IF NOT EXISTS patterns_loaded integer DEFAULT 0;