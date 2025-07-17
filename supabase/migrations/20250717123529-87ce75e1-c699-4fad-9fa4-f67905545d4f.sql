-- Add new columns to daily_goals table for calorie deficit and macro percentages
ALTER TABLE public.daily_goals 
ADD COLUMN calorie_deficit integer DEFAULT 0,
ADD COLUMN protein_percentage integer DEFAULT 30,
ADD COLUMN carbs_percentage integer DEFAULT 40,
ADD COLUMN fats_percentage integer DEFAULT 30;