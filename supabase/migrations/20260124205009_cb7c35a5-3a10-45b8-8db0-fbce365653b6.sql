-- =====================================================
-- ARES Protocol Phase 2: Database Schema
-- Tasks 1-4: mitochondrial_protocols, epitalon_cycles, nootropic_stacks, bio_age_tracking extension
-- =====================================================

-- Task 1: Mitochondrial Protocols Table (SS-31, MOTS-c)
CREATE TABLE IF NOT EXISTS mitochondrial_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Substance Info
  substance_name TEXT NOT NULL, -- 'ss_31', 'mots_c'
  
  -- Dosierung
  dose_amount NUMERIC NOT NULL,
  dose_unit TEXT NOT NULL DEFAULT 'mg',
  
  -- Timing (wichtig: vor Training!)
  timing TEXT NOT NULL DEFAULT 'pre_zone2', -- 'pre_zone2', 'pre_vo2max', 'morning_fasted', 'evening'
  
  -- Frequenz pro Woche
  frequency_per_week INTEGER NOT NULL DEFAULT 3,
  preferred_days TEXT[] DEFAULT ARRAY['monday', 'wednesday', 'friday'],
  
  -- Zyklus-Management (8 weeks on / 4 weeks off)
  cycle_weeks_on INTEGER DEFAULT 8,
  cycle_weeks_off INTEGER DEFAULT 4,
  current_cycle_week INTEGER DEFAULT 1,
  cycle_started_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  protocol_phase INTEGER DEFAULT 2,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for mitochondrial_protocols
CREATE INDEX IF NOT EXISTS idx_mito_protocols_user ON mitochondrial_protocols(user_id);
CREATE INDEX IF NOT EXISTS idx_mito_protocols_active ON mitochondrial_protocols(user_id, is_active);

-- RLS for mitochondrial_protocols
ALTER TABLE mitochondrial_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mito protocols" ON mitochondrial_protocols
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mito protocols" ON mitochondrial_protocols
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mito protocols" ON mitochondrial_protocols
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mito protocols" ON mitochondrial_protocols
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Task 2: Epitalon Cycles Table (Khavinson Protocol)
-- =====================================================

CREATE TABLE IF NOT EXISTS epitalon_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Dosierung (Standard: 10mg/Tag)
  dose_mg NUMERIC NOT NULL DEFAULT 10,
  
  -- Khavinson-Protokoll: 10-20 Tage
  duration_days INTEGER NOT NULL DEFAULT 10,
  
  -- Aktueller Zyklus
  cycle_number INTEGER NOT NULL DEFAULT 1,
  cycle_started_at TIMESTAMPTZ,
  cycle_ended_at TIMESTAMPTZ,
  current_day INTEGER DEFAULT 0,
  
  -- Status: 'scheduled', 'active', 'completed', 'skipped'
  status TEXT DEFAULT 'scheduled',
  
  -- Nächster Zyklus (alle 6 Monate)
  next_cycle_due TIMESTAMPTZ,
  
  -- Injection Tracking
  injections_completed INTEGER DEFAULT 0,
  injection_site_rotation TEXT[] DEFAULT ARRAY['abdomen', 'thigh', 'deltoid'],
  last_injection_site TEXT,
  
  -- Notizen
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for epitalon_cycles
CREATE INDEX IF NOT EXISTS idx_epitalon_user ON epitalon_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_epitalon_status ON epitalon_cycles(user_id, status);
CREATE INDEX IF NOT EXISTS idx_epitalon_next ON epitalon_cycles(user_id, next_cycle_due);

-- RLS for epitalon_cycles
ALTER TABLE epitalon_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own epitalon cycles" ON epitalon_cycles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own epitalon cycles" ON epitalon_cycles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own epitalon cycles" ON epitalon_cycles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own epitalon cycles" ON epitalon_cycles
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Task 3: Nootropic Stacks Table (Semax, Selank)
-- =====================================================

CREATE TABLE IF NOT EXISTS nootropic_stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Substanz-Info: 'semax', 'selank', 'semax_selank_combo'
  substance_name TEXT NOT NULL,
  
  -- Dosierung
  dose_mcg NUMERIC NOT NULL DEFAULT 200,
  administration_route TEXT DEFAULT 'nasal', -- 'nasal', 'subcutaneous'
  
  -- Timing: 'morning', 'pre_work', 'split_am_pm'
  timing TEXT NOT NULL DEFAULT 'morning',
  
  -- Cycle Pattern: 4 Wochen on, 2 Wochen off
  cycle_weeks_on INTEGER DEFAULT 4,
  cycle_weeks_off INTEGER DEFAULT 2,
  current_cycle_week INTEGER DEFAULT 1,
  is_on_cycle BOOLEAN DEFAULT true,
  cycle_started_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  protocol_phase INTEGER DEFAULT 2,
  
  -- Cognitive Tracking (optional)
  baseline_focus_score INTEGER,
  current_focus_score INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for nootropic_stacks
CREATE INDEX IF NOT EXISTS idx_nootropic_user ON nootropic_stacks(user_id);
CREATE INDEX IF NOT EXISTS idx_nootropic_active ON nootropic_stacks(user_id, is_active);

-- RLS for nootropic_stacks
ALTER TABLE nootropic_stacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nootropic stacks" ON nootropic_stacks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nootropic stacks" ON nootropic_stacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nootropic stacks" ON nootropic_stacks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own nootropic stacks" ON nootropic_stacks
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- Task 4: Extend bio_age_tracking Table
-- =====================================================

-- Add missing columns for full Bio-Age tracking
ALTER TABLE bio_age_tracking 
  ADD COLUMN IF NOT EXISTS hdl NUMERIC,
  ADD COLUMN IF NOT EXISTS triglycerides NUMERIC,
  ADD COLUMN IF NOT EXISTS chronological_age NUMERIC,
  ADD COLUMN IF NOT EXISTS age_difference NUMERIC,
  ADD COLUMN IF NOT EXISTS previous_measurement_id UUID REFERENCES bio_age_tracking(id),
  ADD COLUMN IF NOT EXISTS test_report_url TEXT,
  ADD COLUMN IF NOT EXISTS measurement_type TEXT DEFAULT 'proxy_calculation',
  ADD COLUMN IF NOT EXISTS proxy_inputs JSONB;