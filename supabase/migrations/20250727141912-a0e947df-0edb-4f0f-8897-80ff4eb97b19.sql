-- Add leftover tracking columns to meals table
ALTER TABLE public.meals 
ADD COLUMN leftover_images TEXT[] DEFAULT '{}',
ADD COLUMN consumption_percentage NUMERIC DEFAULT 100.0,
ADD COLUMN leftover_analysis_metadata JSONB DEFAULT '{}';

-- Add index for better performance on consumption percentage queries
CREATE INDEX idx_meals_consumption_percentage ON public.meals(consumption_percentage);

-- Add comment for documentation
COMMENT ON COLUMN public.meals.leftover_images IS 'Array of image URLs showing leftover food';
COMMENT ON COLUMN public.meals.consumption_percentage IS 'Percentage of food actually consumed (100 = all eaten, 50 = half eaten)';
COMMENT ON COLUMN public.meals.leftover_analysis_metadata IS 'Metadata from AI analysis of leftovers';