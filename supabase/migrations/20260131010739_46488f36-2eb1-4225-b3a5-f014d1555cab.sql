
-- Flag MoleQlar products as verified
UPDATE supplement_products
SET is_verified = true
WHERE brand_id IN (
  SELECT id FROM supplement_brands WHERE name = 'MoleQlar'
);
