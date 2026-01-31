
-- Delete Thorne and Centrum products and brands
-- First delete products (due to foreign key constraint)
DELETE FROM supplement_products 
WHERE brand_id IN (
  SELECT id FROM supplement_brands WHERE name IN ('Thorne', 'Centrum')
);

-- Then delete the brands
DELETE FROM supplement_brands 
WHERE name IN ('Thorne', 'Centrum');
