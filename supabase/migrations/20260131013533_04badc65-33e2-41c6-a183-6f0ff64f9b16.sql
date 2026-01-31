-- Delete empty brands (no products)
DELETE FROM supplement_brands WHERE slug IN ('amazon-generic', 'lebenskraft-pur');