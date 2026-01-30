-- Phase 1: Add enriched product fields to supplement_products
-- 25+ new columns for quality scores, product info, and Amazon data

ALTER TABLE supplement_products 
ADD COLUMN IF NOT EXISTS short_description TEXT,
ADD COLUMN IF NOT EXISTS bioavailability NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS potency NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS reviews NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS origin TEXT,
ADD COLUMN IF NOT EXISTS lab_tests NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS purity NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS value NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS impact_score_big8 NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS serving_size TEXT,
ADD COLUMN IF NOT EXISTS servings_per_container NUMERIC,
ADD COLUMN IF NOT EXISTS dosage_per_serving TEXT,
ADD COLUMN IF NOT EXISTS quality_purity NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_bioavailability NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_dosage NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_synergy NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_research NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_form NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_value NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS quality_transparency NUMERIC(3,1),
ADD COLUMN IF NOT EXISTS timing TEXT,
ADD COLUMN IF NOT EXISTS is_gluten_free BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS country_of_origin TEXT,
ADD COLUMN IF NOT EXISTS amazon_url TEXT,
ADD COLUMN IF NOT EXISTS amazon_image TEXT,
ADD COLUMN IF NOT EXISTS amazon_name TEXT,
ADD COLUMN IF NOT EXISTS match_score NUMERIC(3,2);

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_supplement_products_category ON supplement_products(category);

-- Add index for quality score filtering  
CREATE INDEX IF NOT EXISTS idx_supplement_products_impact_score ON supplement_products(impact_score_big8 DESC NULLS LAST);