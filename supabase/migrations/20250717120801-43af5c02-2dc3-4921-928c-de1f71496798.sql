-- Add weight goal fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN target_weight DECIMAL(5,2),
ADD COLUMN target_date DATE;