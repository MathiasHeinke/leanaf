-- Rapamycin Log Tabelle (wöchentliche Einnahme)
CREATE TABLE rapamycin_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Dosierung
  dose_mg NUMERIC NOT NULL DEFAULT 5,
  
  -- Timing
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  taken_fasted BOOLEAN DEFAULT true,
  
  -- Wöchentliches Tracking
  week_number INTEGER,
  cycle_active BOOLEAN DEFAULT true,
  
  -- Intervall-Tracking
  days_since_last_dose INTEGER,
  target_interval_days INTEGER DEFAULT 7,
  
  -- Biomarker bei Einnahme (optional)
  weight_kg NUMERIC,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  
  -- Nebenwirkungen als JSONB
  side_effects JSONB DEFAULT '[]',
  
  -- Infektions-Check
  infection_signs BOOLEAN DEFAULT false,
  infection_notes TEXT,
  
  -- Blutbild-Referenz
  blood_panel_id UUID,
  
  -- Zyklus-Management
  pause_reason TEXT,
  
  -- Notizen
  notes TEXT,
  
  -- Disclaimer bestätigt
  medical_disclaimer_accepted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rapamycin_user ON rapamycin_log(user_id);
CREATE INDEX idx_rapamycin_date ON rapamycin_log(user_id, taken_at DESC);
CREATE INDEX idx_rapamycin_cycle ON rapamycin_log(user_id, cycle_active);

-- RLS
ALTER TABLE rapamycin_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rapamycin logs" ON rapamycin_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rapamycin logs" ON rapamycin_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rapamycin logs" ON rapamycin_log
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rapamycin logs" ON rapamycin_log
  FOR DELETE USING (auth.uid() = user_id);

-- View: Rapamycin Statistiken
CREATE OR REPLACE VIEW v_rapamycin_stats AS
SELECT 
  user_id,
  COUNT(*) as total_doses,
  COUNT(*) FILTER (WHERE cycle_active = true) as active_cycle_doses,
  AVG(dose_mg) as avg_dose,
  MAX(taken_at) as last_taken,
  MIN(taken_at) as first_taken,
  AVG(days_since_last_dose) as avg_interval
FROM rapamycin_log
GROUP BY user_id;