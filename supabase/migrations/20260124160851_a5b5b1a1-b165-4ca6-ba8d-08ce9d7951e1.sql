-- ARES Protocol System: Haupttabellen

-- 1. user_protocol_status - Zentrale Status-Tabelle
CREATE TABLE public.user_protocol_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_phase INTEGER DEFAULT 0 CHECK (current_phase >= 0 AND current_phase <= 3),
  phase_started_at TIMESTAMPTZ DEFAULT now(),
  protocol_mode TEXT DEFAULT 'advanced' CHECK (protocol_mode IN ('analog', 'advanced')),
  
  phase_0_checklist JSONB DEFAULT '{
    "toxin_free": {"completed": false, "confirmed_at": null},
    "sleep_score": {"completed": false, "avg_hours": null, "validated_at": null},
    "bio_sanierung": {"completed": false, "confirmed_at": null},
    "psycho_hygiene": {"completed": false, "confirmed_at": null},
    "digital_hygiene": {"completed": false, "confirmed_at": null},
    "protein_training": {"completed": false, "protein_avg": null, "zone2_avg": null, "validated_at": null},
    "kfa_trend": {"completed": false, "current_kfa": null, "trend": null, "validated_at": null},
    "bloodwork_baseline": {"completed": false, "markers_present": [], "validated_at": null}
  }'::jsonb,
  
  phase_0_completed_at TIMESTAMPTZ,
  phase_1_started_at TIMESTAMPTZ,
  phase_1_target_kfa NUMERIC DEFAULT 15,
  phase_2_started_at TIMESTAMPTZ,
  phase_3_started_at TIMESTAMPTZ,
  
  is_paused BOOLEAN DEFAULT false,
  paused_at TIMESTAMPTZ,
  pause_reason TEXT CHECK (pause_reason IN ('health', 'travel', 'financial', 'other', NULL)),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- 2. senolytic_cycles - Hit-and-Run Protokolle (Phase 3)
CREATE TABLE public.senolytic_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  substance TEXT NOT NULL DEFAULT 'fisetin',
  protocol TEXT DEFAULT 'mayo_clinic' CHECK (protocol IN ('mayo_clinic', 'custom')),
  dose_per_kg NUMERIC DEFAULT 20,
  duration_days INTEGER DEFAULT 3,
  cycle_started_at TIMESTAMPTZ,
  cycle_completed_at TIMESTAMPTZ,
  next_cycle_due TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. aromatase_management - Anti-Östrogen-Stack
CREATE TABLE public.aromatase_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stack_active BOOLEAN DEFAULT false,
  activated_reason TEXT,
  zinc_dose_mg NUMERIC DEFAULT 30,
  dim_dose_mg NUMERIC DEFAULT 200,
  cdg_dose_mg NUMERIC DEFAULT 500,
  cdg_frequency TEXT DEFAULT 'twice_daily',
  last_estrogen_check TIMESTAMPTZ,
  last_estrogen_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- 4. training_tracking - Die 3 Säulen
CREATE TABLE public.training_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  strength_completed BOOLEAN DEFAULT false,
  strength_type TEXT CHECK (strength_type IN ('rpt', 'volume', 'deload', NULL)),
  strength_exercises JSONB DEFAULT '[]'::jsonb,
  zone2_minutes INTEGER DEFAULT 0,
  zone2_type TEXT,
  zone2_avg_hr INTEGER,
  vo2max_completed BOOLEAN DEFAULT false,
  vo2max_protocol TEXT,
  vo2max_peak_hr INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, date)
);

-- 5. bio_age_tracking - DunedinPACE + Proxy
CREATE TABLE public.bio_age_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ DEFAULT now(),
  hba1c NUMERIC,
  hscrp NUMERIC,
  ldl NUMERIC,
  calculated_bio_age NUMERIC,
  calculation_method TEXT DEFAULT 'phenoage_simplified',
  dunedin_pace NUMERIC CHECK (dunedin_pace IS NULL OR (dunedin_pace >= 0.3 AND dunedin_pace <= 1.5)),
  test_provider TEXT,
  test_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. peptide_intake_log - Tägliches Tracking
CREATE TABLE public.peptide_intake_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.peptide_protocols(id) ON DELETE SET NULL,
  peptide_name TEXT NOT NULL,
  dose_mcg NUMERIC,
  dose_unit TEXT DEFAULT 'mcg',
  timing TEXT CHECK (timing IN ('morning_fasted', 'pre_workout', 'post_workout', 'evening_fasted', 'before_bed', 'with_meal', 'custom')),
  injection_site TEXT,
  taken_at TIMESTAMPTZ DEFAULT now(),
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Erweiterung peptide_protocols
ALTER TABLE public.peptide_protocols
  ADD COLUMN IF NOT EXISTS phase INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cycle_pattern JSONB DEFAULT '{"days_on": 5, "days_off": 2}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_cycle_day INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cycle_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS titration_schedule JSONB,
  ADD COLUMN IF NOT EXISTS timing TEXT DEFAULT 'evening_fasted',
  ADD COLUMN IF NOT EXISTS injection_sites JSONB DEFAULT '["abdomen_left", "abdomen_right", "thigh_left", "thigh_right"]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_injection_site INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.user_protocol_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.senolytic_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aromatase_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bio_age_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peptide_intake_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own protocol status"
  ON public.user_protocol_status FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own senolytic cycles"
  ON public.senolytic_cycles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own aromatase management"
  ON public.aromatase_management FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own training tracking"
  ON public.training_tracking FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own bio age tracking"
  ON public.bio_age_tracking FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own peptide intake log"
  ON public.peptide_intake_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX idx_protocol_status_user ON public.user_protocol_status(user_id);
CREATE INDEX idx_senolytic_cycles_user ON public.senolytic_cycles(user_id);
CREATE INDEX idx_training_tracking_user_date ON public.training_tracking(user_id, date);
CREATE INDEX idx_bio_age_tracking_user ON public.bio_age_tracking(user_id, measured_at);
CREATE INDEX idx_peptide_intake_log_user_date ON public.peptide_intake_log(user_id, taken_at);

-- Updated_at Triggers
CREATE TRIGGER update_user_protocol_status_updated_at
  BEFORE UPDATE ON public.user_protocol_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_senolytic_cycles_updated_at
  BEFORE UPDATE ON public.senolytic_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aromatase_management_updated_at
  BEFORE UPDATE ON public.aromatase_management
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_tracking_updated_at
  BEFORE UPDATE ON public.training_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bio_age_tracking_updated_at
  BEFORE UPDATE ON public.bio_age_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();