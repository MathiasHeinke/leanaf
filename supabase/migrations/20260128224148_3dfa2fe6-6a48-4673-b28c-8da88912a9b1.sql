-- Biogena Brand einfügen (fehlt in DB)
INSERT INTO public.supplement_brands (name, slug, country, website, price_tier, specialization, quality_certifications, description)
VALUES (
  'Biogena',
  'biogena',
  'EU',
  'biogena.com',
  'luxury',
  ARRAY['longevity', 'premium', 'reinsubstanzen'],
  ARRAY['GMP', 'ISO22000', 'HACCP'],
  'Salzburger Premium-Hersteller. Reinsubstanzen ohne Zusätze.'
)
ON CONFLICT (slug) DO NOTHING;