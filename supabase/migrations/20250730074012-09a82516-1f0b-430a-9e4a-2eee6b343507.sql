-- Add macro columns to fluid_database
ALTER TABLE public.fluid_database 
ADD COLUMN protein_per_100ml numeric DEFAULT 0,
ADD COLUMN carbs_per_100ml numeric DEFAULT 0,
ADD COLUMN fats_per_100ml numeric DEFAULT 0;

-- Update existing fluids with common macro values
UPDATE public.fluid_database 
SET protein_per_100ml = 3.3, carbs_per_100ml = 4.8, fats_per_100ml = 3.3
WHERE name ILIKE '%milch%' OR name ILIKE '%milk%';

UPDATE public.fluid_database 
SET protein_per_100ml = 20, carbs_per_100ml = 5, fats_per_100ml = 2
WHERE name ILIKE '%protein%' OR name ILIKE '%shake%';

UPDATE public.fluid_database 
SET carbs_per_100ml = 10
WHERE name ILIKE '%saft%' OR name ILIKE '%juice%' OR name ILIKE '%smoothie%';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_fluid_database_macros ON public.fluid_database(protein_per_100ml, carbs_per_100ml, fats_per_100ml);