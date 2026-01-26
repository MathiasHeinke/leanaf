-- Add confetti_enabled column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS confetti_enabled boolean DEFAULT true;

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.confetti_enabled IS 'User preference for showing celebration confetti/fireworks animations';