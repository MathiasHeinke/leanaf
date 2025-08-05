-- Phase 3: Markus Rühl Database Schemas
-- Tracking für Heavy Training, Mass Progress und Competition Prep

-- 1. Markus Heavy Training Sessions (PR-Tracking für Grundübungen)
CREATE TABLE public.markus_heavy_training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  exercise_type TEXT NOT NULL CHECK (exercise_type IN ('squat', 'deadlift', 'bench_press', 'overhead_press', 'bent_over_row')),
  weight_kg NUMERIC(6,2) NOT NULL,
  reps INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
  is_personal_record BOOLEAN DEFAULT false,
  training_intensity TEXT NOT NULL DEFAULT 'heavy' CHECK (training_intensity IN ('light', 'moderate', 'heavy', 'max_effort')),
  rest_between_sets_seconds INTEGER DEFAULT 180,
  notes TEXT,
  warmup_sets JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Markus Mass Progress (Gewichts-/Umfang-Entwicklung)
CREATE TABLE public.markus_mass_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  body_weight_kg NUMERIC(5,2),
  body_fat_percentage NUMERIC(4,2),
  muscle_mass_kg NUMERIC(5,2),
  measurements JSONB DEFAULT '{}'::jsonb, -- chest, arms, waist, thighs, etc.
  daily_calories INTEGER,
  daily_protein_grams INTEGER,
  training_volume_kg NUMERIC(8,2), -- total volume lifted that day
  progress_photos TEXT[], -- URLs to progress photos
  strength_indicators JSONB DEFAULT '{}'::jsonb, -- max lifts, volume PRs
  markus_rating INTEGER CHECK (markus_rating BETWEEN 1 AND 10), -- Rühl's subjective rating
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Markus Competition Prep (Wettkampf-Zyklen & Peak-Week-Logs)
CREATE TABLE public.markus_competition_prep (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  competition_name TEXT NOT NULL,
  competition_date DATE NOT NULL,
  prep_phase TEXT NOT NULL CHECK (prep_phase IN ('off_season', 'prep_start', 'mid_prep', 'peak_week', 'post_competition')),
  weeks_out INTEGER NOT NULL,
  current_weight_kg NUMERIC(5,2),
  target_weight_kg NUMERIC(5,2),
  body_fat_percentage NUMERIC(4,2),
  daily_calories INTEGER,
  daily_carbs_grams INTEGER,
  daily_protein_grams INTEGER,
  daily_fats_grams INTEGER,
  cardio_minutes_per_day INTEGER DEFAULT 0,
  training_frequency_per_week INTEGER DEFAULT 5,
  supplements JSONB DEFAULT '[]'::jsonb,
  peak_week_protocol JSONB DEFAULT '{}'::jsonb, -- water, sodium, carb manipulation
  condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 10),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  hunger_level INTEGER CHECK (hunger_level BETWEEN 1 AND 10),
  markus_feedback TEXT,
  coach_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes für Performance
CREATE INDEX idx_markus_heavy_training_user_date ON public.markus_heavy_training_sessions(user_id, date DESC);
CREATE INDEX idx_markus_heavy_training_exercise ON public.markus_heavy_training_sessions(user_id, exercise_type, date DESC);
CREATE INDEX idx_markus_mass_progress_user_date ON public.markus_mass_progress(user_id, date DESC);
CREATE INDEX idx_markus_competition_prep_user_comp ON public.markus_competition_prep(user_id, competition_date DESC);

-- RLS Policies aktivieren
ALTER TABLE public.markus_heavy_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markus_mass_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markus_competition_prep ENABLE ROW LEVEL SECURITY;

-- RLS Policies für markus_heavy_training_sessions
CREATE POLICY "Users can manage their own heavy training sessions"
ON public.markus_heavy_training_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view heavy training sessions for coaching"
ON public.markus_heavy_training_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = markus_heavy_training_sessions.user_id
  ) OR 
  ((current_setting('request.jwt.claims', true))::jsonb ->> 'role') = 'service_role'
);

-- RLS Policies für markus_mass_progress
CREATE POLICY "Users can manage their own mass progress"
ON public.markus_mass_progress
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view mass progress for coaching"
ON public.markus_mass_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = markus_mass_progress.user_id
  ) OR 
  ((current_setting('request.jwt.claims', true))::jsonb ->> 'role') = 'service_role'
);

-- RLS Policies für markus_competition_prep
CREATE POLICY "Users can manage their own competition prep"
ON public.markus_competition_prep
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view competition prep for coaching"
ON public.markus_competition_prep
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = markus_competition_prep.user_id
  ) OR 
  ((current_setting('request.jwt.claims', true))::jsonb ->> 'role') = 'service_role'
);

-- Trigger für updated_at
CREATE TRIGGER update_markus_heavy_training_sessions_updated_at
  BEFORE UPDATE ON public.markus_heavy_training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_markus_mass_progress_updated_at
  BEFORE UPDATE ON public.markus_mass_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_markus_competition_prep_updated_at
  BEFORE UPDATE ON public.markus_competition_prep
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();