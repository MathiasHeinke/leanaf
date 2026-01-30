-- Add Natural Elements brand
INSERT INTO supplement_brands (name, slug, country, website, price_tier, specialization, quality_certifications, description)
VALUES 
  ('Natural Elements', 'natural-elements', 'DE', 'natural-elements.eu', 'mid', ARRAY['amazon', 'premium', 'natural'], ARRAY['made-in-de', 'lab-tested', 'vegan'], 'Premium Amazon-Marke aus Deutschland. Breites Sortiment mit hohen Qualitätsstandards.')
ON CONFLICT (slug) DO NOTHING;