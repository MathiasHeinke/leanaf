-- Delete all deprecated products
DELETE FROM supplement_products WHERE is_deprecated = true;