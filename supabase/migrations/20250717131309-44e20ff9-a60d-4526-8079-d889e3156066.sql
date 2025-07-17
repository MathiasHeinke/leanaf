
-- Add unique constraint on user_id for daily_goals table to enable proper upsert operations
ALTER TABLE public.daily_goals 
ADD CONSTRAINT daily_goals_user_id_unique UNIQUE (user_id);
