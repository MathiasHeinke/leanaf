-- =====================================================
-- ARES Supplement-Datenbank v3.0: Massive Erweiterung
-- =====================================================

-- 1. Neue Tabelle: supplement_brands (Hersteller)
CREATE TABLE IF NOT EXISTS supplement_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  country TEXT DEFAULT 'DE',
  website TEXT,
  price_tier TEXT CHECK (price_tier IN ('budget', 'mid', 'premium', 'luxury')),
  specialization TEXT[] DEFAULT '{}',
  quality_certifications TEXT[] DEFAULT '{}',
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Neue Tabelle: supplement_products (Konkrete Produkte)
CREATE TABLE IF NOT EXISTS supplement_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES supplement_brands(id) ON DELETE SET NULL,
  supplement_id UUID REFERENCES supplement_database(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  pack_size INTEGER NOT NULL,
  pack_unit TEXT DEFAULT 'capsules',
  servings_per_pack INTEGER,
  dose_per_serving DECIMAL(10,2) NOT NULL,
  dose_unit TEXT NOT NULL,
  ingredients JSONB,
  price_eur DECIMAL(8,2),
  price_per_serving DECIMAL(6,2),
  form TEXT,
  is_vegan BOOLEAN DEFAULT false,
  is_organic BOOLEAN DEFAULT false,
  allergens TEXT[] DEFAULT '{}',
  product_url TEXT,
  amazon_asin TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_recommended BOOLEAN DEFAULT false,
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Neue Tabelle: peptide_compounds (Peptide & Research)
CREATE TABLE IF NOT EXISTS peptide_compounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('healing', 'longevity', 'nootropic', 'gh_secretagogue', 'metabolic', 'immune', 'testo', 'skin')),
  description TEXT,
  mechanism TEXT,
  impact_score DECIMAL(3,1) DEFAULT 5.0 CHECK (impact_score >= 0 AND impact_score <= 10),
  protocol_phase INTEGER DEFAULT 2 CHECK (protocol_phase IN (2, 3)),
  dosage_research TEXT,
  frequency TEXT,
  administration_route TEXT CHECK (administration_route IN ('subcutaneous', 'intramuscular', 'nasal', 'oral', 'topical')),
  cycle_protocol TEXT,
  timing_notes TEXT,
  synergies TEXT[] DEFAULT '{}',
  warnings TEXT[] DEFAULT '{}',
  legal_status TEXT DEFAULT 'research_only' CHECK (legal_status IN ('research_only', 'rx_required', 'approved_other_countries', 'banned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Neue Tabelle: peptide_suppliers (Bezugsquellen)
CREATE TABLE IF NOT EXISTS peptide_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  country TEXT DEFAULT 'EU',
  website TEXT,
  shipping_to_de BOOLEAN DEFAULT true,
  quality_tier TEXT DEFAULT 'standard' CHECK (quality_tier IN ('verified', 'standard', 'unknown')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Neue Tabelle: peptide_stacks (8 Protokolle)
CREATE TABLE IF NOT EXISTS peptide_stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  goal TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('muscle', 'testo', 'metabolic', 'immune', 'sleep', 'nootropic', 'healing', 'longevity')),
  protocol_phase INTEGER DEFAULT 2 CHECK (protocol_phase IN (2, 3)),
  peptides JSONB NOT NULL,
  duration_weeks INTEGER,
  critical_rules TEXT[] DEFAULT '{}',
  expected_effects TEXT[] DEFAULT '{}',
  warning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Erweiterung supplement_database mit neuen Spalten
ALTER TABLE supplement_database 
ADD COLUMN IF NOT EXISTS form_quality TEXT CHECK (form_quality IN ('schlecht', 'gut', 'optimal')),
ADD COLUMN IF NOT EXISTS synergies TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS blockers TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cycling_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cycling_protocol TEXT,
ADD COLUMN IF NOT EXISTS underrated_score INTEGER DEFAULT 0 CHECK (underrated_score >= 0 AND underrated_score <= 10),
ADD COLUMN IF NOT EXISTS warnung TEXT;

-- 7. Indexes für schnelle Filterung
CREATE INDEX IF NOT EXISTS idx_products_brand ON supplement_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_supplement ON supplement_products(supplement_id);
CREATE INDEX IF NOT EXISTS idx_products_popularity ON supplement_products(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_products_recommended ON supplement_products(is_recommended) WHERE is_recommended = true;
CREATE INDEX IF NOT EXISTS idx_peptides_category ON peptide_compounds(category);
CREATE INDEX IF NOT EXISTS idx_peptides_phase ON peptide_compounds(protocol_phase);
CREATE INDEX IF NOT EXISTS idx_stacks_category ON peptide_stacks(category);
CREATE INDEX IF NOT EXISTS idx_brands_tier ON supplement_brands(price_tier);

-- 8. RLS Policies für neue Tabellen
ALTER TABLE supplement_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptide_compounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptide_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptide_stacks ENABLE ROW LEVEL SECURITY;

-- Öffentlicher Lesezugriff für Katalog-Tabellen (wie supplement_database)
CREATE POLICY "Public read access for supplement_brands"
ON supplement_brands FOR SELECT
USING (true);

CREATE POLICY "Public read access for supplement_products"
ON supplement_products FOR SELECT
USING (true);

CREATE POLICY "Public read access for peptide_compounds"
ON peptide_compounds FOR SELECT
USING (true);

CREATE POLICY "Public read access for peptide_suppliers"
ON peptide_suppliers FOR SELECT
USING (true);

CREATE POLICY "Public read access for peptide_stacks"
ON peptide_stacks FOR SELECT
USING (true);

-- Kommentare
COMMENT ON TABLE supplement_brands IS 'ARES: Deutsche & internationale Supplement-Hersteller mit Quality-Tiers';
COMMENT ON TABLE supplement_products IS 'ARES: Konkrete Produkte mit Preisen, Packungsgrößen und €/Tag Berechnung';
COMMENT ON TABLE peptide_compounds IS 'ARES: Research Peptide mit Dosierungen und Protokollen (Phase 2-3)';
COMMENT ON TABLE peptide_suppliers IS 'ARES: Peptid-Bezugsquellen mit Qualitäts-Einschätzung';
COMMENT ON TABLE peptide_stacks IS 'ARES: 8 fertige Peptid-Stack-Protokolle für verschiedene Ziele';
COMMENT ON COLUMN supplement_database.form_quality IS 'Bioverfügbarkeit: schlecht/gut/optimal';
COMMENT ON COLUMN supplement_database.synergies IS 'Wirkstoffe die zusammen besser wirken';
COMMENT ON COLUMN supplement_database.blockers IS 'Substanzen die Aufnahme blockieren';