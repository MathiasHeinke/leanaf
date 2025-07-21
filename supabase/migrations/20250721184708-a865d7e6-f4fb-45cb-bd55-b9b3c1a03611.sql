
-- Update existing rest days to have did_workout = false
UPDATE workouts 
SET did_workout = false 
WHERE workout_type = 'pause' AND did_workout = true;
