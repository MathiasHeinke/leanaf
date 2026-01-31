-- Set all products updated today to verified
UPDATE supplement_products 
SET is_verified = true 
WHERE updated_at >= '2026-01-31'::date 
  AND is_deprecated = false;