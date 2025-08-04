-- Add Body Fat Percentage goal columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS target_body_fat_percentage NUMERIC(4,1);

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS goal_type TEXT CHECK (goal_type IN ('weight', 'body_fat', 'both')) DEFAULT 'weight';

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.target_body_fat_percentage IS 'User target body fat percentage goal (5-50%)';
COMMENT ON COLUMN public.profiles.goal_type IS 'Primary goal type for progress widgets: weight, body_fat, or both';