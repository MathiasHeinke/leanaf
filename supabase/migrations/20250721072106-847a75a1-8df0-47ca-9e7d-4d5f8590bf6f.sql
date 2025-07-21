
-- Create body_measurements table for tracking body measurements
CREATE TABLE public.body_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  chest NUMERIC(5,2), -- cm
  waist NUMERIC(5,2), -- cm (Taille)
  belly NUMERIC(5,2), -- cm (Bauchumfang über Bauchnabel)
  hips NUMERIC(5,2), -- cm
  thigh NUMERIC(5,2), -- cm (Oberschenkel)
  photo_url TEXT, -- Optional progress photo
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workouts table for simple training tracking
CREATE TABLE public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  did_workout BOOLEAN NOT NULL DEFAULT false,
  workout_type TEXT CHECK (workout_type IN ('kraft', 'cardio', 'mix')) DEFAULT 'kraft',
  duration_minutes INTEGER, -- Optional duration
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 5), -- 1-5 scale
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sleep_tracking table for sleep quality tracking
CREATE TABLE public.sleep_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours NUMERIC(3,1), -- Hours slept (e.g., 7.5)
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5), -- 1-5 scale
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create badges table for gamification
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- 'measurement_consistency', 'workout_streak', 'deficit_consistency', etc.
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb -- Additional data like streak count, etc.
);

-- Add RLS policies for body_measurements
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own body measurements" 
  ON public.body_measurements 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own body measurements" 
  ON public.body_measurements 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body measurements" 
  ON public.body_measurements 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body measurements" 
  ON public.body_measurements 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add RLS policies for workouts
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workouts" 
  ON public.workouts 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workouts" 
  ON public.workouts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts" 
  ON public.workouts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts" 
  ON public.workouts 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add RLS policies for sleep_tracking
ALTER TABLE public.sleep_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sleep data" 
  ON public.sleep_tracking 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep data" 
  ON public.sleep_tracking 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep data" 
  ON public.sleep_tracking 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep data" 
  ON public.sleep_tracking 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add RLS policies for badges
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges" 
  ON public.badges 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own badges" 
  ON public.badges 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Add unique constraints to prevent duplicate entries per day
ALTER TABLE public.body_measurements 
  ADD CONSTRAINT unique_user_date_measurements 
  UNIQUE (user_id, date);

ALTER TABLE public.workouts 
  ADD CONSTRAINT unique_user_date_workouts 
  UNIQUE (user_id, date);

ALTER TABLE public.sleep_tracking 
  ADD CONSTRAINT unique_user_date_sleep 
  UNIQUE (user_id, date);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_body_measurements_updated_at 
  BEFORE UPDATE ON public.body_measurements 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at 
  BEFORE UPDATE ON public.workouts 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sleep_tracking_updated_at 
  BEFORE UPDATE ON public.sleep_tracking 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
