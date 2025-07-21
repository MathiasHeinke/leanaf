
-- Add columns for running/walking tracking to workouts table
ALTER TABLE workouts ADD COLUMN distance_km NUMERIC;
ALTER TABLE workouts ADD COLUMN steps INTEGER;
ALTER TABLE workouts ADD COLUMN walking_notes TEXT;
