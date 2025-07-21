
-- Add unique constraint on user_id for user_points table to support UPSERT operations
ALTER TABLE public.user_points 
ADD CONSTRAINT user_points_user_id_unique UNIQUE (user_id);
