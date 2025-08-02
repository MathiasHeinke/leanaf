-- ============================================
-- Vollwertiger Trainingsplan v1 - DB Schema
-- ============================================

-- 1.1 Enhanced Training Plan Schema
CREATE TABLE IF NOT EXISTS public.training_plan_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_id TEXT NOT NULL, -- 'mon', 'tue', etc.
  day_name TEXT NOT NULL,
  focus TEXT, -- 'Push', 'Pull', 'Legs', etc.
  position INTEGER NOT NULL DEFAULT 1,
  is_rest_day BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_day_id UUID NOT NULL REFERENCES public.training_plan_days(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_type TEXT DEFAULT 'strength', -- 'strength', 'cardio', 'mobility'
  muscle_groups TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 1,
  is_superset BOOLEAN DEFAULT false,
  superset_group TEXT,
  progression_type TEXT DEFAULT 'linear', -- 'linear', 'wave', 'autoregulation'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES public.training_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  target_reps INTEGER,
  target_reps_range TEXT, -- '8-12', '6-8', etc.
  target_load_kg NUMERIC,
  target_pct_1rm NUMERIC,
  target_rpe INTEGER, -- 1-10 scale
  target_rir INTEGER, -- Reps in Reserve
  tempo TEXT, -- '3-1-2-1' format
  rest_seconds INTEGER DEFAULT 120,
  is_warmup BOOLEAN DEFAULT false,
  progression_rule JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 1.2 Scientific Exercise Templates
CREATE TABLE IF NOT EXISTS public.training_exercise_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'compound', 'isolation', 'cardio'
  primary_muscles TEXT[] NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  difficulty_level TEXT DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced'
  biomechanics JSONB DEFAULT '{}', -- ROM, force curve, etc.
  research_citations TEXT[] DEFAULT '{}',
  load_progression JSONB DEFAULT '{}', -- progression guidelines
  volume_guidelines JSONB DEFAULT '{}', -- sets/reps recommendations
  frequency_guidelines JSONB DEFAULT '{}', -- weekly frequency
  gender_modifications JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 1.3 User Training History & Strength Profile
CREATE TABLE IF NOT EXISTS public.user_training_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sets_performed INTEGER,
  reps_performed INTEGER,
  load_kg NUMERIC,
  rpe_actual INTEGER,
  rir_actual INTEGER,
  estimated_1rm NUMERIC,
  volume_load NUMERIC GENERATED ALWAYS AS (sets_performed * reps_performed * load_kg) STORED,
  session_id UUID REFERENCES public.exercise_sessions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 1.4 User Strength Profile View
CREATE OR REPLACE VIEW public.v_user_strength_profile AS
SELECT 
  user_id,
  exercise_name,
  COUNT(*) as total_sessions,
  AVG(estimated_1rm) as avg_estimated_1rm,
  MAX(estimated_1rm) as max_estimated_1rm,
  AVG(rpe_actual) as avg_rpe,
  AVG(volume_load) as avg_volume_load,
  AVG(CASE WHEN reps_performed BETWEEN 1 AND 5 THEN rpe_actual END) as avg_rpe_strength,
  AVG(CASE WHEN reps_performed BETWEEN 6 AND 12 THEN rpe_actual END) as avg_rpe_hypertrophy,
  AVG(CASE WHEN reps_performed > 12 THEN rpe_actual END) as avg_rpe_endurance,
  DATE_TRUNC('week', MAX(date)) as last_training_week,
  -- Strength classification
  CASE 
    WHEN MAX(estimated_1rm) > 1.5 * 80 THEN 'advanced' -- Example: 1.5x bodyweight bench
    WHEN MAX(estimated_1rm) > 1.0 * 80 THEN 'intermediate'
    ELSE 'beginner'
  END as strength_level
FROM public.user_training_history
WHERE estimated_1rm IS NOT NULL
GROUP BY user_id, exercise_name;

-- 1.5 Enhanced Workout Plans
ALTER TABLE public.workout_plans 
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS duration_weeks INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS target_frequency INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS scientific_basis JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS progression_scheme JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft', -- 'draft', 'active', 'completed', 'archived'
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS coach_notes TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_plan_days_plan_id ON public.training_plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_training_exercises_plan_day_id ON public.training_exercises(plan_day_id);
CREATE INDEX IF NOT EXISTS idx_training_sets_exercise_id ON public.training_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_user_training_history_user_exercise ON public.user_training_history(user_id, exercise_name);
CREATE INDEX IF NOT EXISTS idx_user_training_history_date ON public.user_training_history(date DESC);

-- RLS Policies
ALTER TABLE public.training_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_exercise_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_history ENABLE ROW LEVEL SECURITY;

-- Training plan days policies
CREATE POLICY "Users can view training plan days for their plans" ON public.training_plan_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp 
      WHERE wp.id = plan_id AND wp.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage training plan days for their plans" ON public.training_plan_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp 
      WHERE wp.id = plan_id AND wp.created_by = auth.uid()
    )
  );

-- Training exercises policies  
CREATE POLICY "Users can view exercises for their plans" ON public.training_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.training_plan_days tpd
      JOIN public.workout_plans wp ON wp.id = tpd.plan_id
      WHERE tpd.id = plan_day_id AND wp.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage exercises for their plans" ON public.training_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.training_plan_days tpd
      JOIN public.workout_plans wp ON wp.id = tpd.plan_id
      WHERE tpd.id = plan_day_id AND wp.created_by = auth.uid()
    )
  );

-- Training sets policies
CREATE POLICY "Users can view sets for their exercises" ON public.training_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.training_exercises te
      JOIN public.training_plan_days tpd ON tpd.id = te.plan_day_id
      JOIN public.workout_plans wp ON wp.id = tpd.plan_id
      WHERE te.id = exercise_id AND wp.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage sets for their exercises" ON public.training_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.training_exercises te
      JOIN public.training_plan_days tpd ON tpd.id = te.plan_day_id
      JOIN public.workout_plans wp ON wp.id = tpd.plan_id
      WHERE te.id = exercise_id AND wp.created_by = auth.uid()
    )
  );

-- Exercise templates - public read access
CREATE POLICY "Anyone can view exercise templates" ON public.training_exercise_templates
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage exercise templates" ON public.training_exercise_templates
  FOR ALL USING (is_super_admin());

-- User training history policies
CREATE POLICY "Users can view their own training history" ON public.user_training_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own training history" ON public.user_training_history
  FOR ALL USING (auth.uid() = user_id);

-- Coaches can view training history for coaching
CREATE POLICY "Coaches can view training history for coaching" ON public.user_training_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_conversations
      WHERE coach_conversations.user_id = user_training_history.user_id
    ) OR (
      (current_setting('request.jwt.claims', true))::jsonb ->> 'role' = 'service_role'
    )
  );

-- Updated at triggers
CREATE TRIGGER update_training_plan_days_updated_at
  BEFORE UPDATE ON public.training_plan_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_exercises_updated_at
  BEFORE UPDATE ON public.training_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_sets_updated_at
  BEFORE UPDATE ON public.training_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_exercise_templates_updated_at
  BEFORE UPDATE ON public.training_exercise_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Populate some basic exercise templates
INSERT INTO public.training_exercise_templates (name, category, primary_muscles, secondary_muscles, equipment, difficulty_level, research_citations) VALUES
('Bench Press', 'compound', ARRAY['pectorals'], ARRAY['triceps', 'anterior_deltoid'], ARRAY['barbell', 'bench'], 'intermediate', ARRAY['Schoenfeld_2019', 'Kraemer_2017']),
('Squat', 'compound', ARRAY['quadriceps', 'glutes'], ARRAY['hamstrings', 'calves'], ARRAY['barbell', 'rack'], 'intermediate', ARRAY['Schoenfeld_2019']),
('Deadlift', 'compound', ARRAY['hamstrings', 'glutes', 'erector_spinae'], ARRAY['traps', 'lats', 'rhomboids'], ARRAY['barbell'], 'advanced', ARRAY['Helms_2020']),
('Overhead Press', 'compound', ARRAY['anterior_deltoid'], ARRAY['triceps', 'upper_chest'], ARRAY['barbell', 'dumbbells'], 'intermediate', ARRAY['Kraemer_2017']),
('Pull-ups', 'compound', ARRAY['lats'], ARRAY['rhomboids', 'biceps'], ARRAY['pull_up_bar'], 'intermediate', ARRAY['Schoenfeld_2019']),
('Dips', 'compound', ARRAY['triceps', 'lower_chest'], ARRAY['anterior_deltoid'], ARRAY['dip_bars'], 'intermediate', ARRAY['Kraemer_2017'])
ON CONFLICT DO NOTHING;