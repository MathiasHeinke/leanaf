
-- Ensure the unique constraint exists on weight_history table
-- This will prevent duplicate entries for the same user and date
-- If the constraint already exists, this will do nothing
ALTER TABLE public.weight_history 
ADD CONSTRAINT weight_history_user_id_date_unique UNIQUE (user_id, date);
