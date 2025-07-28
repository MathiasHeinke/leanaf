-- Add missing duration_minutes column to exercise_sessions table
ALTER TABLE public.exercise_sessions 
ADD COLUMN duration_minutes integer;

-- Update the column to allow null values for existing records
UPDATE public.exercise_sessions 
SET duration_minutes = NULL 
WHERE duration_minutes IS NULL;