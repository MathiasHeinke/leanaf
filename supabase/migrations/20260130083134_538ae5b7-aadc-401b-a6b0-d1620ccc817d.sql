-- Add Gloryfeel and GymBeam brands
INSERT INTO supplement_brands (name, slug, country, website, price_tier, specialization, quality_certifications, description)
VALUES 
  ('Gloryfeel', 'gloryfeel', 'DE', 'gloryfeel.de', 'budget', ARRAY['amazon', 'budget', 'multivitamin'], ARRAY['made-in-de', 'lab-tested'], 'Amazon-Bestseller aus Deutschland. Budget-freundliche Vitamine mit hohen Bewertungen.'),
  ('GymBeam', 'gymbeam', 'EU', 'gymbeam.de', 'budget', ARRAY['sport', 'budget', 'protein'], ARRAY['lab-tested'], 'Slowakische Sport-Supplements. Guenstige Basics wie Kreatin und Whey.')
ON CONFLICT (slug) DO NOTHING;