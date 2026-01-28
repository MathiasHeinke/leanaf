-- =====================================================
-- ARES Stack Architect: Schema-Erweiterung Phase 1
-- =====================================================

-- 1. Erweiterung supplement_database (Master-Katalog)
ALTER TABLE public.supplement_database 
  ADD COLUMN IF NOT EXISTS timing_constraint TEXT DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS interaction_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brand_recommendation TEXT;

-- 2. Erweiterung user_supplements (User-Stack)
ALTER TABLE public.user_supplements
  ADD COLUMN IF NOT EXISTS stock_count INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS preferred_timing TEXT DEFAULT 'morning';

-- 3. Seed-Update: ARES Essentials mit erweiterten Daten
UPDATE public.supplement_database SET 
  timing_constraint = 'with_fats',
  interaction_tags = ARRAY['needs_fat']
WHERE name ILIKE '%Vitamin D%' OR name ILIKE '%D3%';

UPDATE public.supplement_database SET 
  timing_constraint = 'with_fats',
  interaction_tags = ARRAY['needs_fat']
WHERE name ILIKE '%Omega%';

UPDATE public.supplement_database SET 
  timing_constraint = 'bedtime'
WHERE name ILIKE '%Magnesium%';

UPDATE public.supplement_database SET 
  timing_constraint = 'fasted',
  interaction_tags = ARRAY['blocks_copper']
WHERE name ILIKE '%Zink%' OR name ILIKE '%Zinc%';

UPDATE public.supplement_database SET 
  timing_constraint = 'any'
WHERE name ILIKE '%Creatin%' OR name ILIKE '%Creatine%';

UPDATE public.supplement_database SET 
  timing_constraint = 'with_fats',
  interaction_tags = ARRAY['needs_fat', 'needs_piperine']
WHERE name ILIKE '%Curcumin%' OR name ILIKE '%Kurkuma%';

UPDATE public.supplement_database SET 
  timing_constraint = 'any',
  interaction_tags = ARRAY['avoid_evening']
WHERE name ILIKE '%Koffein%' OR name ILIKE '%Caffeine%';

UPDATE public.supplement_database SET 
  timing_constraint = 'fasted'
WHERE name ILIKE '%NMN%';

UPDATE public.supplement_database SET 
  timing_constraint = 'fasted',
  interaction_tags = ARRAY['blocks_zinc', 'needs_vitamin_c']
WHERE name ILIKE '%Eisen%' OR name ILIKE '%Iron%';

-- 4. Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_supplement_database_timing_constraint 
ON public.supplement_database(timing_constraint);

CREATE INDEX IF NOT EXISTS idx_user_supplements_schedule_type 
ON public.user_supplements(schedule_type);