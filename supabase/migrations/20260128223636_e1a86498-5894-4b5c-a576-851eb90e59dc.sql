-- Drop the old unique constraint that only allows 1 entry per day
ALTER TABLE public.diary_entries 
DROP CONSTRAINT IF EXISTS diary_entries_user_id_date_key;

-- Create a new unique constraint that allows multiple entries per day but only 1 per mood category
-- This way users can have one "dankbarkeit", one "reflektion", and one "ziele" entry per day
ALTER TABLE public.diary_entries 
ADD CONSTRAINT diary_entries_user_date_mood_unique UNIQUE (user_id, date, mood);