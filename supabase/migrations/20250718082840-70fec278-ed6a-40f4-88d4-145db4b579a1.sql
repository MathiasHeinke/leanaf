-- First, let's see what we have
-- Delete duplicate daily_goals entries, keeping only the most recent one
WITH ranked_goals AS (
  SELECT id, user_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM daily_goals
)
DELETE FROM daily_goals 
WHERE id IN (
  SELECT id FROM ranked_goals WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE daily_goals ADD CONSTRAINT daily_goals_user_id_unique UNIQUE (user_id);