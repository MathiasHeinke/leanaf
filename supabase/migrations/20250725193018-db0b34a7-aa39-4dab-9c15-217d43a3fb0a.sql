-- Remove unique constraint to allow multiple workouts per day
ALTER TABLE public.workouts DROP CONSTRAINT unique_user_date_workouts;