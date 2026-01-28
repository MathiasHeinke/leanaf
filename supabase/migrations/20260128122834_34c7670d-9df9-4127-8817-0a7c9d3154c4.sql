-- Add new columns for ARES Impact Score System
ALTER TABLE supplement_database 
ADD COLUMN IF NOT EXISTS protocol_phase integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS impact_score decimal(3,1) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS necessity_tier text DEFAULT 'optimizer',
ADD COLUMN IF NOT EXISTS priority_score integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS evidence_level text DEFAULT 'moderat',
ADD COLUMN IF NOT EXISTS hallmarks_addressed text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cost_per_day_eur decimal(5,2),
ADD COLUMN IF NOT EXISTS amazon_de_asin text;

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_supps_phase ON supplement_database(protocol_phase);
CREATE INDEX IF NOT EXISTS idx_supps_tier ON supplement_database(necessity_tier);
CREATE INDEX IF NOT EXISTS idx_supps_impact ON supplement_database(impact_score DESC);

-- Comments for documentation
COMMENT ON COLUMN supplement_database.protocol_phase IS '0=Natural, 1=TRT/GLP-1, 2=Peptide, 3=Longevity';
COMMENT ON COLUMN supplement_database.impact_score IS 'ARES Impact Score: 9-10 Essential, 7-8 Optimizer, <7 Specialist';
COMMENT ON COLUMN supplement_database.necessity_tier IS 'essential = Must-have, optimizer = Should-have, specialist = Nice-to-have';