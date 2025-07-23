-- Create exercises table for exercise definitions
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'push', 'pull', 'legs', 'cardio', 'core'
  muscle_groups TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  instructions TEXT,
  equipment TEXT,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  is_compound BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise_sessions table for workout sessions
CREATE TABLE public.exercise_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_name TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  workout_id UUID, -- Optional link to existing workouts table
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise_sets table for individual sets
CREATE TABLE public.exercise_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.exercise_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg NUMERIC,
  reps INTEGER,
  distance_m NUMERIC, -- For cardio exercises
  duration_seconds INTEGER, -- For time-based exercises
  rest_seconds INTEGER,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10), -- Rate of Perceived Exertion
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise_templates table for workout templates
CREATE TABLE public.exercise_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'push_pull_legs', 'upper_lower', 'full_body', 'custom'
  exercises JSONB NOT NULL DEFAULT '[]', -- Array of exercise configurations
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exercises (public read, admin write)
CREATE POLICY "Anyone can view exercises" ON public.exercises FOR SELECT USING (true);
CREATE POLICY "Super admins can manage exercises" ON public.exercises FOR ALL USING (is_super_admin());

-- RLS Policies for exercise_sessions
CREATE POLICY "Users can view their own exercise sessions" ON public.exercise_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own exercise sessions" ON public.exercise_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercise sessions" ON public.exercise_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exercise sessions" ON public.exercise_sessions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for exercise_sets
CREATE POLICY "Users can view their own exercise sets" ON public.exercise_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own exercise sets" ON public.exercise_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercise sets" ON public.exercise_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exercise sets" ON public.exercise_sets FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for exercise_templates
CREATE POLICY "Users can view their own templates and public ones" ON public.exercise_templates FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can create their own exercise templates" ON public.exercise_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercise templates" ON public.exercise_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exercise templates" ON public.exercise_templates FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_exercise_sessions_user_date ON public.exercise_sessions(user_id, date);
CREATE INDEX idx_exercise_sets_session ON public.exercise_sets(session_id);
CREATE INDEX idx_exercise_sets_user ON public.exercise_sets(user_id, created_at);
CREATE INDEX idx_exercise_templates_user ON public.exercise_templates(user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exercise_sessions_updated_at BEFORE UPDATE ON public.exercise_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exercise_sets_updated_at BEFORE UPDATE ON public.exercise_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exercise_templates_updated_at BEFORE UPDATE ON public.exercise_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some basic exercises
INSERT INTO public.exercises (name, category, muscle_groups, description, is_compound) VALUES
('Bankdrücken', 'push', '{"chest", "triceps", "shoulders"}', 'Klassische Brustübung mit der Langhantel', true),
('Kniebeugen', 'legs', '{"quadriceps", "glutes", "hamstrings"}', 'Grundübung für die Beine', true),
('Kreuzheben', 'pull', '{"hamstrings", "glutes", "lower_back", "traps"}', 'Komplexe Ganzkörperübung', true),
('Klimmzüge', 'pull', '{"lats", "biceps", "rhomboids"}', 'Rückenübung mit dem eigenen Körpergewicht', true),
('Schulterdrücken', 'push', '{"shoulders", "triceps"}', 'Überkopfdrücken für die Schultern', true),
('Bizeps Curls', 'pull', '{"biceps"}', 'Isolationsübung für den Bizeps', false),
('Trizeps Dips', 'push', '{"triceps", "chest"}', 'Übung für den Trizeps', false),
('Plank', 'core', '{"core", "shoulders"}', 'Statische Rumpfübung', false);