-- Add images column to meals table
ALTER TABLE public.meals 
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.meals.images IS 'Array of image URLs for the meal';