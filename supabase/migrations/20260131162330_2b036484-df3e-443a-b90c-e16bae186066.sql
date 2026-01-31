-- =====================================================
-- Phase 1: Add ingredient_ids column for combo products
-- =====================================================

-- Add new column for ingredient references
ALTER TABLE supplement_database
ADD COLUMN ingredient_ids text[] DEFAULT NULL;

COMMENT ON COLUMN supplement_database.ingredient_ids IS 
'Array of supplement names that compose this product (e.g., Pre-Workout contains L-Citrullin, Beta-Alanin)';

-- =====================================================
-- Populate initial data for known combo products
-- =====================================================

-- Pre-Workout Komplex
UPDATE supplement_database
SET ingredient_ids = ARRAY['L-Citrullin', 'Beta-Alanin', 'Taurin', 'Koffein', 'L-Arginin']
WHERE name = 'Pre-Workout Komplex';

-- Multivitamin
UPDATE supplement_database
SET ingredient_ids = ARRAY['Vitamin A', 'Vitamin B Komplex', 'Vitamin C', 'Vitamin D', 'Vitamin E', 'Zink', 'Magnesium']
WHERE name = 'Multivitamin';

-- Greens products
UPDATE supplement_database
SET ingredient_ids = ARRAY['Spirulina', 'Chlorella', 'Weizengras']
WHERE name ILIKE '%greens%';

-- A-Z Komplex (if exists as separate from Multivitamin)
UPDATE supplement_database
SET ingredient_ids = ARRAY['Vitamin A', 'Vitamin B Komplex', 'Vitamin C', 'Vitamin D', 'Vitamin E', 'Vitamin K', 'Zink', 'Magnesium', 'Selen']
WHERE name = 'A-Z Komplex';