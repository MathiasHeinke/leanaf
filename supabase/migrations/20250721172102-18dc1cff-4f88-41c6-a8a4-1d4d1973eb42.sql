
-- Update the workouts table constraints to allow the values used by the UI

-- Drop existing constraints
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_intensity_check;
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_workout_type_check;

-- Add updated constraints
ALTER TABLE workouts ADD CONSTRAINT workouts_intensity_check 
CHECK (intensity IS NULL OR (intensity >= 0 AND intensity <= 10));

ALTER TABLE workouts ADD CONSTRAINT workouts_workout_type_check 
CHECK (workout_type IN ('kraft', 'cardio', 'mix', 'pause', 'other'));
