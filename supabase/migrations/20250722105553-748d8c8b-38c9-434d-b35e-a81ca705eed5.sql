
-- Add meal evaluation fields to the meals table
ALTER TABLE public.meals 
ADD COLUMN IF NOT EXISTS quality_score integer,
ADD COLUMN IF NOT EXISTS bonus_points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_feedback text,
ADD COLUMN IF NOT EXISTS evaluation_criteria jsonb DEFAULT '{}'::jsonb;
