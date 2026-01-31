-- 1. Insert Kobho Labs brand
INSERT INTO public.supplement_brands (
  name, slug, country, website, price_tier, 
  specialization, quality_certifications, description
) VALUES (
  'Kobho Labs',
  'kobho-labs',
  'EU',
  'kobholabs.com',
  'mid',
  ARRAY['longevity', 'antioxidants', 'heart'],
  ARRAY['GMP', 'IFS', 'GMO-free'],
  'Spanischer Premium-Hersteller für Longevity-Supplements. Eigene Formulierungen mit patentierten Inhaltsstoffen.'
);

-- 2. Insert product (using brand_id from inserted brand)
INSERT INTO public.supplement_products (
  brand_id,
  supplement_id,
  product_name,
  pack_size,
  pack_unit,
  servings_per_pack,
  dose_per_serving,
  dose_unit,
  price_eur,
  price_per_serving,
  form,
  category,
  country_of_origin,
  is_vegan,
  is_verified,
  is_recommended,
  quality_tags,
  timing,
  amazon_asin,
  amazon_url,
  product_url,
  short_description,
  synergies,
  blockers
) VALUES (
  (SELECT id FROM supplement_brands WHERE slug = 'kobho-labs'),
  '7d8018a3-a9aa-4231-9c5f-7cca6a6e9061',
  'Astaxanthin + CoQ10',
  60,
  'Softgels',
  60,
  1,
  'Kapsel',
  25.95,
  0.43,
  'softgel',
  'Anti-Aging',
  'ES',
  false,
  true,
  true,
  ARRAY['AstaPure', 'GMO-free', 'IFS', 'GMP', 'Made in Spain'],
  'with_meals',
  'B0DNN2PHTZ',
  'https://www.amazon.de/dp/B0DNN2PHTZ',
  'https://kobholabs.com/products/astaxanthin-coq10',
  'Natürliches Astaxanthin aus Haematococcus pluvialis mit Coenzym Q10 und nativem Olivenöl für optimale Absorption.',
  ARRAY['omega 3', 'vitamin e', 'olivenoel'],
  ARRAY['andere astaxanthin produkte']
);

-- 3. Update supplement_database with enriched data
UPDATE public.supplement_database
SET 
  synergies = ARRAY['Omega-3', 'Vitamin E', 'PQQ'],
  blockers = ARRAY[]::text[],
  evidence_level = 'moderat',
  hallmarks_addressed = ARRAY['oxidative-stress', 'heart', 'skin', 'eye']
WHERE id = '7d8018a3-a9aa-4231-9c5f-7cca6a6e9061';