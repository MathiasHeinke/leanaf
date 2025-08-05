-- Dr. Vita Femina Tools Database Schema
-- Phase 3: Create tables for specialized female health tracking

-- 1. Cycle Assessments Table
CREATE TABLE public.cycle_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  cycle_length INTEGER NOT NULL DEFAULT 28,
  last_period_date DATE,
  current_phase TEXT NOT NULL DEFAULT 'unknown',
  phase_day INTEGER NOT NULL DEFAULT 0,
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  energy_level INTEGER NOT NULL DEFAULT 5,
  mood_assessment TEXT NOT NULL DEFAULT 'neutral',
  training_readiness INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Hormone Tracking Table  
CREATE TABLE public.hormone_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  symptoms JSONB NOT NULL DEFAULT '{"physical": [], "emotional": [], "cognitive": []}',
  energy_level INTEGER NOT NULL DEFAULT 5,
  sleep_quality INTEGER NOT NULL DEFAULT 5,
  stress_level INTEGER NOT NULL DEFAULT 5,
  cravings TEXT[] NOT NULL DEFAULT '{}',
  skin_condition TEXT NOT NULL DEFAULT 'normal',
  libido_level INTEGER NOT NULL DEFAULT 5,
  pain_level INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Female Periodization Plans Table
CREATE TABLE public.female_periodization_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_data JSONB NOT NULL DEFAULT '{}',
  user_preferences JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Menopause Profiles Table
CREATE TABLE public.menopause_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_data JSONB NOT NULL DEFAULT '{}',
  guidance_plan JSONB NOT NULL DEFAULT '{}',
  last_assessment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cycle_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hormone_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.female_periodization_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menopause_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cycle_assessments
CREATE POLICY "Users can manage their own cycle assessments"
ON public.cycle_assessments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view cycle assessments for coaching"
ON public.cycle_assessments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = cycle_assessments.user_id
  ) OR 
  current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
);

-- RLS Policies for hormone_tracking
CREATE POLICY "Users can manage their own hormone tracking"
ON public.hormone_tracking
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view hormone tracking for coaching"
ON public.hormone_tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = hormone_tracking.user_id
  ) OR 
  current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
);

-- RLS Policies for female_periodization_plans  
CREATE POLICY "Users can manage their own periodization plans"
ON public.female_periodization_plans
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view periodization plans for coaching"
ON public.female_periodization_plans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = female_periodization_plans.user_id
  ) OR 
  current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
);

-- RLS Policies for menopause_profiles
CREATE POLICY "Users can manage their own menopause profiles"
ON public.menopause_profiles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view menopause profiles for coaching"
ON public.menopause_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = menopause_profiles.user_id
  ) OR 
  current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'service_role'
);

-- Add indexes for better performance
CREATE INDEX idx_cycle_assessments_user_date ON public.cycle_assessments(user_id, date);
CREATE INDEX idx_cycle_assessments_phase ON public.cycle_assessments(current_phase);

CREATE INDEX idx_hormone_tracking_user_date ON public.hormone_tracking(user_id, date);
CREATE INDEX idx_hormone_tracking_energy ON public.hormone_tracking(energy_level);

CREATE INDEX idx_female_periodization_user ON public.female_periodization_plans(user_id);
CREATE INDEX idx_female_periodization_active ON public.female_periodization_plans(user_id, is_active);

CREATE INDEX idx_menopause_profiles_user ON public.menopause_profiles(user_id);
CREATE INDEX idx_menopause_profiles_assessment ON public.menopause_profiles(user_id, last_assessment_date);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_cycle_assessments_updated_at
  BEFORE UPDATE ON public.cycle_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hormone_tracking_updated_at
  BEFORE UPDATE ON public.hormone_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_female_periodization_plans_updated_at
  BEFORE UPDATE ON public.female_periodization_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menopause_profiles_updated_at
  BEFORE UPDATE ON public.menopause_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraints where appropriate
CREATE UNIQUE INDEX idx_cycle_assessments_user_date_unique 
ON public.cycle_assessments(user_id, date);

CREATE UNIQUE INDEX idx_hormone_tracking_user_date_unique 
ON public.hormone_tracking(user_id, date);

CREATE UNIQUE INDEX idx_menopause_profiles_user_unique 
ON public.menopause_profiles(user_id);