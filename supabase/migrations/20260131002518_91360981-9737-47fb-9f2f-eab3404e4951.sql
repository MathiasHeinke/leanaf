-- Add is_deprecated column to supplement_products table
-- This column marks products that exist in DB but not in the latest brand JSON files
ALTER TABLE supplement_products 
ADD COLUMN IF NOT EXISTS is_deprecated BOOLEAN DEFAULT false;

-- Add index for efficient filtering of deprecated products
CREATE INDEX IF NOT EXISTS idx_supplement_products_is_deprecated 
ON supplement_products(is_deprecated) 
WHERE is_deprecated = true;