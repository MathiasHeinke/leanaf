-- NAD+ Tracking Tabelle
CREATE TABLE nad_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  
  -- Supplement-Info
  supplement_type TEXT NOT NULL DEFAULT 'nmn',
  brand TEXT,
  dose_mg NUMERIC NOT NULL DEFAULT 500,
  formulation TEXT DEFAULT 'capsule',
  
  -- Timing
  timing TEXT DEFAULT 'morning_fasted',
  with_resveratrol BOOLEAN DEFAULT false,
  resveratrol_dose_mg NUMERIC,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- NAD+ Blutwert-Messungen
CREATE TABLE nad_blood_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  measured_at TIMESTAMPTZ DEFAULT now(),
  
  -- NAD+ Level (wenn getestet)
  nad_level NUMERIC,
  nad_unit TEXT DEFAULT 'µM',
  
  -- Indirekte Marker
  lactate NUMERIC,
  pyruvate NUMERIC,
  lactate_pyruvate_ratio NUMERIC,
  
  -- Test-Details
  test_provider TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_nad_tracking_user ON nad_tracking(user_id);
CREATE INDEX idx_nad_blood_user ON nad_blood_levels(user_id);

-- RLS
ALTER TABLE nad_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE nad_blood_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own NAD tracking" ON nad_tracking
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own NAD blood levels" ON nad_blood_levels
  FOR ALL USING (auth.uid() = user_id);