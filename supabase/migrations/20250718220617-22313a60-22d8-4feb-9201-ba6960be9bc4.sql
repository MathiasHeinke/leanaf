-- Add preferred_theme column to profiles table
ALTER TABLE public.profiles ADD COLUMN preferred_theme TEXT DEFAULT 'standard';

-- Add a check constraint for valid theme values
ALTER TABLE public.profiles ADD CONSTRAINT valid_theme_check 
CHECK (preferred_theme IN ('standard', 'anthracite', 'royal', 'male', 'female'));