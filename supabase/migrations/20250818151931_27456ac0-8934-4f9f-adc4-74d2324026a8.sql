-- Add fluid_goal_ml column to profiles table for weight-based fluid calculations
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fluid_goal_ml INTEGER DEFAULT 2500;

-- Add steps_goal column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS steps_goal INTEGER DEFAULT 10000;

-- Update existing daily_goals to have consistent naming
ALTER TABLE public.daily_goals 
ADD COLUMN IF NOT EXISTS fluid_goal_ml INTEGER;

-- Copy existing fluids values to new fluid_goal_ml column
UPDATE public.daily_goals 
SET fluid_goal_ml = fluids 
WHERE fluid_goal_ml IS NULL AND fluids IS NOT NULL;

-- Set default value for records with no fluid goal
UPDATE public.daily_goals 
SET fluid_goal_ml = 2500 
WHERE fluid_goal_ml IS NULL;

-- Make the new column not null after setting defaults
ALTER TABLE public.daily_goals 
ALTER COLUMN fluid_goal_ml SET NOT NULL;

-- Add steps_goal to daily_goals table
ALTER TABLE public.daily_goals 
ADD COLUMN IF NOT EXISTS steps_goal INTEGER DEFAULT 10000;