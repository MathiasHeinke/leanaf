-- Phase 3 Database Schema
-- Block A: Tasks 1-5

-- 1. Extend senolytic_cycles if columns missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'senolytic_cycles' AND column_name = 'senolytic_type') THEN
    ALTER TABLE senolytic_cycles ADD COLUMN senolytic_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'senolytic_cycles' AND column_name = 'primary_dose_mg') THEN
    ALTER TABLE senolytic_cycles ADD COLUMN primary_dose_mg NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'senolytic_cycles' AND column_name = 'secondary_dose_mg') THEN
    ALTER TABLE senolytic_cycles ADD COLUMN secondary_dose_mg NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'senolytic_cycles' AND column_name = 'protocol_name') THEN
    ALTER TABLE senolytic_cycles ADD COLUMN protocol_name TEXT DEFAULT 'mayo_clinic';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'senolytic_cycles' AND column_name = 'cycle_number') THEN
    ALTER TABLE senolytic_cycles ADD COLUMN cycle_number INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'senolytic_cycles' AND column_name = 'current_day') THEN
    ALTER TABLE senolytic_cycles ADD COLUMN current_day INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'senolytic_cycles' AND column_name = 'preferred_cycle_day') THEN
    ALTER TABLE senolytic_cycles ADD COLUMN preferred_cycle_day INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'senolytic_cycles' AND column_name = 'doses_taken') THEN
    ALTER TABLE senolytic_cycles ADD COLUMN doses_taken INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'senolytic_cycles' AND column_name = 'fasting_during_cycle') THEN
    ALTER TABLE senolytic_cycles ADD COLUMN fasting_during_cycle BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'senolytic_cycles' AND column_name = 'quercetin_preload') THEN
    ALTER TABLE senolytic_cycles ADD COLUMN quercetin_preload BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'senolytic_cycles' AND column_name = 'side_effects') THEN
    ALTER TABLE senolytic_cycles ADD COLUMN side_effects JSONB DEFAULT '[]';
  END IF;
END $$;

-- 2. Create extended_fasting_cycles table
CREATE TABLE IF NOT EXISTS extended_fasting_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  fasting_type TEXT NOT NULL DEFAULT 'water_only',
  planned_duration_days INTEGER NOT NULL DEFAULT 5,
  actual_duration_days INTEGER,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  current_day INTEGER DEFAULT 0,
  status TEXT DEFAULT 'planned',
  daily_logs JSONB DEFAULT '[]',
  entered_ketosis_day INTEGER,
  peak_ketones_mmol NUMERIC,
  autophagy_indicators JSONB,
  refeeding_started_at TIMESTAMPTZ,
  refeeding_duration_days INTEGER DEFAULT 3,
  refeeding_log JSONB DEFAULT '[]',
  next_fast_due TIMESTAMPTZ,
  electrolytes_taken BOOLEAN DEFAULT true,
  supplements_paused TEXT[] DEFAULT ARRAY['nmn', 'protein'],
  notes TEXT,
  abort_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create maintenance_protocols table
CREATE TABLE IF NOT EXISTS maintenance_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  substance_name TEXT NOT NULL,
  substance_category TEXT NOT NULL DEFAULT 'longevity',
  dose_amount NUMERIC NOT NULL,
  dose_unit TEXT NOT NULL DEFAULT 'mg',
  frequency TEXT NOT NULL DEFAULT 'daily',
  frequency_days INTEGER,
  timing TEXT NOT NULL DEFAULT 'morning',
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  total_doses_taken INTEGER DEFAULT 0,
  last_taken_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  protocol_phase INTEGER DEFAULT 3,
  started_in_phase INTEGER DEFAULT 3,
  continued_from_phase INTEGER,
  dose_adjustments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create reta_micro_log table
CREATE TABLE IF NOT EXISTS reta_micro_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  dose_mg NUMERIC NOT NULL,
  injected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  injection_site TEXT,
  days_since_last_dose INTEGER,
  target_interval_days INTEGER DEFAULT 12,
  weight_kg NUMERIC,
  waist_cm NUMERIC,
  appetite_score INTEGER,
  satiety_duration_hours NUMERIC,
  gi_side_effects TEXT[],
  gi_severity INTEGER,
  cravings_controlled BOOLEAN,
  energy_level INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create longterm_bioage_tracking table
CREATE TABLE IF NOT EXISTS longterm_bioage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  measured_at TIMESTAMPTZ DEFAULT now(),
  chronological_age_years NUMERIC NOT NULL,
  chronological_age_months NUMERIC,
  dunedin_pace NUMERIC,
  horvath_clock_age NUMERIC,
  hannum_clock_age NUMERIC,
  phenoage NUMERIC,
  grimage NUMERIC,
  telomere_length_kb NUMERIC,
  telomere_percentile INTEGER,
  test_provider TEXT,
  test_type TEXT,
  proxy_inputs JSONB,
  proxy_calculated_age NUMERIC,
  biological_age NUMERIC,
  age_difference NUMERIC,
  aging_rate NUMERIC,
  previous_measurement_id UUID REFERENCES longterm_bioage_tracking(id),
  change_from_previous NUMERIC,
  improvement_percent NUMERIC,
  protocol_phase_at_test INTEGER,
  notable_interventions TEXT[],
  notes TEXT,
  test_report_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE extended_fasting_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE reta_micro_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE longterm_bioage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users manage own extended_fasting_cycles" ON extended_fasting_cycles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own maintenance_protocols" ON maintenance_protocols FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own reta_micro_log" ON reta_micro_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own longterm_bioage_tracking" ON longterm_bioage_tracking FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_extended_fasting_user_status ON extended_fasting_cycles(user_id, status);
CREATE INDEX IF NOT EXISTS idx_extended_fasting_next ON extended_fasting_cycles(user_id, next_fast_due);
CREATE INDEX IF NOT EXISTS idx_maintenance_user_active ON maintenance_protocols(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_maintenance_substance ON maintenance_protocols(user_id, substance_name);
CREATE INDEX IF NOT EXISTS idx_reta_micro_user_date ON reta_micro_log(user_id, injected_at DESC);
CREATE INDEX IF NOT EXISTS idx_longterm_bioage_user_date ON longterm_bioage_tracking(user_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_longterm_bioage_provider ON longterm_bioage_tracking(test_provider);

-- Trigger for next senolytic cycle calculation
CREATE OR REPLACE FUNCTION set_next_senolytic_cycle()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.cycle_ended_at IS NOT NULL THEN
    NEW.next_cycle_due := NEW.cycle_ended_at + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_senolytic_next_cycle ON senolytic_cycles;
CREATE TRIGGER trg_senolytic_next_cycle
  BEFORE UPDATE ON senolytic_cycles
  FOR EACH ROW
  EXECUTE FUNCTION set_next_senolytic_cycle();

-- Function to get next reta micro date
CREATE OR REPLACE FUNCTION get_next_reta_micro_date(p_user_id UUID)
RETURNS TABLE(next_date DATE, days_remaining INTEGER) AS $$
DECLARE
  last_injection TIMESTAMPTZ;
  target_interval INTEGER;
BEGIN
  SELECT injected_at, target_interval_days INTO last_injection, target_interval
  FROM reta_micro_log
  WHERE user_id = p_user_id
  ORDER BY injected_at DESC
  LIMIT 1;

  IF last_injection IS NULL THEN
    RETURN QUERY SELECT CURRENT_DATE, 0;
  ELSE
    RETURN QUERY SELECT
      (last_injection + (target_interval || ' days')::INTERVAL)::DATE,
      GREATEST(0, target_interval - EXTRACT(DAY FROM now() - last_injection)::INTEGER);
  END IF;
END;
$$ LANGUAGE plpgsql;