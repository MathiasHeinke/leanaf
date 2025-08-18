-- Add unique constraint for daily goals and water goal column
CREATE UNIQUE INDEX IF NOT EXISTS daily_goals_unique 
ON daily_goals(user_id, goal_date);

-- Add water goal column if not exists
ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS water_goal_ml INTEGER;