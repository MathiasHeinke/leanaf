-- Add coach_id column to coach_memory for multi-coach support
ALTER TABLE coach_memory ADD COLUMN IF NOT EXISTS coach_id text DEFAULT 'ares';

-- Create unique index for user+coach combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_memory_user_coach 
  ON coach_memory(user_id, coach_id);

-- Update existing rows
UPDATE coach_memory SET coach_id = 'ares' WHERE coach_id IS NULL;
