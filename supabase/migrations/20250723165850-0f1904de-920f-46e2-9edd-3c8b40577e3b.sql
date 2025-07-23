-- Add workout_type column to exercise_sessions table
ALTER TABLE public.exercise_sessions 
ADD COLUMN workout_type TEXT DEFAULT 'strength';

-- Add some common workout type options as comments for reference
-- 'strength' (Krafttraining), 'cardio', 'stretching', 'functional', 'custom'