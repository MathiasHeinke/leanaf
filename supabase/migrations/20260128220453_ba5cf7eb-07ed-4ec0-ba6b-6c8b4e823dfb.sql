-- Add quality_tags column to supplement_products
ALTER TABLE public.supplement_products 
ADD COLUMN IF NOT EXISTS quality_tags TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.supplement_products.quality_tags IS 'Quality certifications and features like ksm-66, creapure, made-in-de, etc.';