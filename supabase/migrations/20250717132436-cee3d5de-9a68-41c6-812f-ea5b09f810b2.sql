
-- Add calculated fields to daily_goals table
ALTER TABLE public.daily_goals 
ADD COLUMN bmr integer,
ADD COLUMN tdee integer;

-- Add BMI fields to profiles table  
ALTER TABLE public.profiles
ADD COLUMN start_bmi numeric(4,1),
ADD COLUMN current_bmi numeric(4,1),
ADD COLUMN target_bmi numeric(4,1);
