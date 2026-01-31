-- =====================================================
-- SUPPLEMENT DATABASE CONSOLIDATION - ROUND 2 (FIXED)
-- Strategy: DELETE orphan user_supplements, then clean DB
-- =====================================================

-- PHASE 1: Fix Elektrolyte products (currently on Magnesium)
UPDATE supplement_products
SET supplement_id = (SELECT id FROM supplement_database WHERE name = 'Elektrolyte (LMNT)' LIMIT 1)
WHERE supplement_id = (SELECT id FROM supplement_database WHERE name = 'Magnesium' LIMIT 1)
  AND (product_name ILIKE '%elektrolyt%' OR product_name ILIKE '%electrolyte%' OR product_name ILIKE '%lmnt%');

-- PHASE 2: Delete orphan user_supplements (users already have main entries or we just remove orphans)
DELETE FROM user_supplements
WHERE supplement_id IN (
  SELECT id FROM supplement_database 
  WHERE name IN (
    'Ashwagandha KSM-66',
    'CaAKG',
    'Alpha-Ketoglutarat (AKG)',
    'Curcumin Longvida',
    'EAA Komplex',
    'Kollagen Peptide',
    'NMN sublingual',
    'Probiotika Multi-Strain',
    'Trans-Resveratrol',
    'Taurin (kardioprotektiv)',
    'Vitamin C (liposomal)'
  )
);

-- PHASE 3: Move NMN products from sub-variants to main
UPDATE supplement_products
SET supplement_id = (SELECT id FROM supplement_database WHERE name = 'NMN' LIMIT 1)
WHERE supplement_id IN (
  SELECT id FROM supplement_database WHERE name ILIKE 'NMN%' AND name != 'NMN'
);

-- PHASE 4: Update impact_scores for main entries
UPDATE supplement_database SET impact_score = 7.8, necessity_tier = 'optimizer' WHERE name = 'Ashwagandha';
UPDATE supplement_database SET impact_score = 8.5, necessity_tier = 'optimizer' WHERE name = 'Ca-AKG (Rejuvant)';
UPDATE supplement_database SET impact_score = 7.0, necessity_tier = 'optimizer' WHERE name = 'Curcumin';
UPDATE supplement_database SET impact_score = 7.5, necessity_tier = 'optimizer' WHERE name = 'Kollagen';
UPDATE supplement_database SET impact_score = 7.3, necessity_tier = 'optimizer' WHERE name = 'Probiotika';
UPDATE supplement_database SET impact_score = 7.8, necessity_tier = 'optimizer' WHERE name = 'Taurin';
UPDATE supplement_database SET impact_score = 8.0, necessity_tier = 'essential' WHERE name = 'Vitamin C';
UPDATE supplement_database SET impact_score = 7.5, necessity_tier = 'optimizer' WHERE name = 'Elektrolyte (LMNT)';

-- PHASE 5: Delete orphan supplement_database entries
DELETE FROM supplement_database
WHERE name IN (
  'Ashwagandha KSM-66',
  'CaAKG',
  'Alpha-Ketoglutarat (AKG)',
  'Curcumin Longvida',
  'EAA Komplex',
  'Kollagen Peptide',
  'NMN sublingual',
  'Probiotika Multi-Strain',
  'Trans-Resveratrol',
  'Taurin (kardioprotektiv)',
  'Vitamin C (liposomal)'
)
AND NOT EXISTS (
  SELECT 1 FROM supplement_products sp WHERE sp.supplement_id = supplement_database.id
);