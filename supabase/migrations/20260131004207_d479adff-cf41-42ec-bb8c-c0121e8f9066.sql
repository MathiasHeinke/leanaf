-- Enrich 8-item quality scores from existing 7-item scores
-- quality_transparency uses average of other scores since origin is text (country name)

UPDATE supplement_products
SET 
  quality_bioavailability = bioavailability,
  quality_purity = purity,
  quality_value = value,
  quality_dosage = potency,
  quality_research = lab_tests,
  quality_transparency = ROUND((COALESCE(bioavailability,0) + COALESCE(purity,0) + COALESCE(lab_tests,0)) / 3.0, 1),
  quality_form = CASE 
    WHEN form = 'liposomal' THEN 10.0
    WHEN form = 'liquid' THEN 9.5
    WHEN form = 'powder' THEN 9.0
    WHEN form = 'softgel' THEN 8.5
    WHEN form = 'capsule' THEN 8.0
    WHEN form = 'tablet' THEN 7.0
    WHEN form = 'gummy' THEN 6.0
    ELSE 8.0
  END,
  quality_synergy = 8.0
WHERE 
  bioavailability IS NOT NULL 
  AND quality_bioavailability IS NULL;