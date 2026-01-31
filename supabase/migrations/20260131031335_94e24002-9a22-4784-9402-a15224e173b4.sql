-- Relink Omega-3 products to the correct "Omega-3 (EPA/DHA)" entry
-- Source: 093c156c-a959-4bc4-9390-a26b16c335f0 (Omega-3 - 37 products)
-- Target: 44dd46b3-27ff-4b07-8a77-2db45238652d (Omega-3 (EPA/DHA) - 0 products)

UPDATE supplement_products
SET supplement_id = '44dd46b3-27ff-4b07-8a77-2db45238652d'
WHERE supplement_id = '093c156c-a959-4bc4-9390-a26b16c335f0';