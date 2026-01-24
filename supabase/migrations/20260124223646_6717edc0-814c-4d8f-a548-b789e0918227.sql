-- Add missing status column to senolytic_cycles
ALTER TABLE senolytic_cycles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

-- Migrate existing data: set status based on cycle_completed_at
UPDATE senolytic_cycles 
SET status = CASE 
  WHEN cycle_completed_at IS NOT NULL THEN 'completed'
  WHEN cycle_started_at IS NOT NULL THEN 'active'
  ELSE 'scheduled'
END
WHERE status IS NULL OR status = 'scheduled';

-- Add alias: cycle_ended_at as view or just use cycle_completed_at in code