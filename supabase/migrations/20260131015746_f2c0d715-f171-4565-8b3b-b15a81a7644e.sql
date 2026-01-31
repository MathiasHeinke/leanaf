-- Step 1: Auto-calculate cost_per_day_eur from linked products (54 supplements)
UPDATE supplement_database sd
SET cost_per_day_eur = subquery.avg_price
FROM (
  SELECT 
    sp.supplement_id,
    ROUND(AVG(sp.price_per_serving)::numeric, 2) as avg_price
  FROM supplement_products sp
  WHERE sp.supplement_id IS NOT NULL
  GROUP BY sp.supplement_id
) subquery
WHERE sd.id = subquery.supplement_id
  AND sd.cost_per_day_eur IS NULL;

-- Step 2: Manual estimates for supplements without linked products (19 supplements)
UPDATE supplement_database
SET cost_per_day_eur = CASE name
  WHEN 'Alpha-Ketoglutarat (AKG)' THEN 0.80
  WHEN 'CaAKG' THEN 1.50
  WHEN 'Astaxanthin + Coenzym Q10' THEN 0.70
  WHEN 'Methylenblau 1%' THEN 0.30
  WHEN 'HMB 3000' THEN 0.50
  WHEN 'Turkesterone Max' THEN 0.80
  WHEN 'Vitamin B Komplex (hochdosiert)' THEN 0.25
  WHEN 'Vitamin D Balance' THEN 0.15
  WHEN 'Vitamin D3 + K2 MK7 Tropfen' THEN 0.10
  WHEN 'Magnesiumcitrat' THEN 0.20
  WHEN 'Magnesium Komplex 11 Ultra' THEN 0.45
  WHEN 'Eisen + Vitamin C' THEN 0.15
  WHEN 'Pinienrinden Extrakt' THEN 0.35
  WHEN 'Nootropic' THEN 0.60
  WHEN 'Pre-Workout Komplex' THEN 0.50
  WHEN 'Protein Pulver' THEN 0.80
  WHEN 'Probiona Kulturen Komplex' THEN 0.40
  WHEN 'Schwarzkümmelöl 1000' THEN 0.25
  WHEN 'Beauty' THEN 0.50
END
WHERE cost_per_day_eur IS NULL
  AND name IN (
    'Alpha-Ketoglutarat (AKG)', 'CaAKG', 'Astaxanthin + Coenzym Q10',
    'Methylenblau 1%', 'HMB 3000', 'Turkesterone Max',
    'Vitamin B Komplex (hochdosiert)', 'Vitamin D Balance',
    'Vitamin D3 + K2 MK7 Tropfen', 'Magnesiumcitrat',
    'Magnesium Komplex 11 Ultra', 'Eisen + Vitamin C',
    'Pinienrinden Extrakt', 'Nootropic', 'Pre-Workout Komplex',
    'Protein Pulver', 'Probiona Kulturen Komplex',
    'Schwarzkümmelöl 1000', 'Beauty'
  );