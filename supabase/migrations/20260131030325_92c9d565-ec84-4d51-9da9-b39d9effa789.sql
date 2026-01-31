-- Big 8 Anreicherung für 3 neue Produkte

-- 1. Kobho Labs Astaxanthin + CoQ10 (ASIN: B0DNN2PHTZ)
UPDATE public.supplement_products SET
  quality_bioavailability = 9.2,
  quality_form = 9.0,
  quality_dosage = 8.5,
  quality_research = 8.0,
  quality_transparency = 8.5,
  quality_purity = 9.0,
  quality_synergy = 9.5,
  quality_value = 7.5,
  impact_score_big8 = 8.59
WHERE amazon_asin = 'B0DNN2PHTZ';

-- 2. Nature Love Vitamin B Komplex Forte (ASIN: B0725X1B5D)
UPDATE public.supplement_products SET
  quality_bioavailability = 9.5,
  quality_form = 8.0,
  quality_dosage = 9.0,
  quality_research = 8.5,
  quality_transparency = 9.0,
  quality_purity = 9.0,
  quality_synergy = 8.0,
  quality_value = 8.5,
  impact_score_big8 = 8.69
WHERE amazon_asin = 'B0725X1B5D';

-- 3. Nature Love Probiona Kulturen Komplex (ASIN: B06XXGNMHB)
UPDATE public.supplement_products SET
  quality_bioavailability = 9.0,
  quality_form = 9.0,
  quality_dosage = 8.5,
  quality_research = 8.0,
  quality_transparency = 9.0,
  quality_purity = 8.5,
  quality_synergy = 9.0,
  quality_value = 8.0,
  impact_score_big8 = 8.63
WHERE amazon_asin = 'B06XXGNMHB';