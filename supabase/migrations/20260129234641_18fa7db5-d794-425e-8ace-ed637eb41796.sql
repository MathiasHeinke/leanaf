-- Add Centrum brand to supplement_brands table
INSERT INTO supplement_brands (name, slug, country, website, price_tier, specialization, quality_certifications, description)
VALUES (
  'Centrum',
  'centrum',
  'US',
  'centrum.de',
  'mid',
  ARRAY['multivitamin', 'classic', 'pharmacy'],
  ARRAY['GMP', 'pharma-grade'],
  'Weltweit führender Multivitamin-Hersteller. Apotheken-Qualität.'
)
ON CONFLICT (slug) DO NOTHING;