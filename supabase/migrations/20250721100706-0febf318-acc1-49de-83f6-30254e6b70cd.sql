
-- Add unique constraint to weight_history table to support UPSERT operations
ALTER TABLE public.weight_history 
ADD CONSTRAINT weight_history_user_id_date_unique UNIQUE (user_id, date);
