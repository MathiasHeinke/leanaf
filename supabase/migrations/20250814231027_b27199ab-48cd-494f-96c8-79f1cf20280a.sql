-- Create exercises reference table for standard exercises
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_de TEXT,
  name_en TEXT,
  primary_muscle_group TEXT NOT NULL,
  secondary_muscle_groups TEXT[] DEFAULT '{}',
  equipment_type TEXT,
  difficulty_level TEXT DEFAULT 'intermediate',
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Create policies for exercises (public read, admin write)
CREATE POLICY "Anyone can view exercises" 
ON public.exercises 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage exercises" 
ON public.exercises 
FOR ALL 
USING (is_super_admin());

-- Create training_sessions table
CREATE TABLE public.training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  split_type TEXT,
  total_duration_minutes INTEGER,
  total_volume_kg NUMERIC,
  notes TEXT,
  session_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for training_sessions
CREATE POLICY "Users can view their own training sessions" 
ON public.training_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own training sessions" 
ON public.training_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training sessions" 
ON public.training_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training sessions" 
ON public.training_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Coaches can view training sessions for coaching
CREATE POLICY "Coaches can view training sessions for coaching" 
ON public.training_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM coach_conversations 
  WHERE coach_conversations.user_id = training_sessions.user_id
));

-- Add indexes for performance
CREATE INDEX idx_training_sessions_user_date ON public.training_sessions (user_id, session_date DESC);
CREATE INDEX idx_exercises_muscle_group ON public.exercises (primary_muscle_group);
CREATE INDEX idx_exercises_name ON public.exercises (name);

-- Insert seed data for common exercises
INSERT INTO public.exercises (name, name_de, name_en, primary_muscle_group, equipment_type, difficulty_level) VALUES
('Pulldown', 'Latziehen', 'Lat Pulldown', 'lats', 'cable_machine', 'beginner'),
('Seated Row', 'Rudern sitzend', 'Seated Cable Row', 'middle_traps', 'cable_machine', 'beginner'),
('Bench Press', 'Bankdrücken', 'Bench Press', 'chest', 'barbell', 'intermediate'),
('Squat', 'Kniebeuge', 'Squat', 'quadriceps', 'barbell', 'intermediate'),
('Deadlift', 'Kreuzheben', 'Deadlift', 'glutes', 'barbell', 'advanced'),
('Overhead Press', 'Überkopfdrücken', 'Overhead Press', 'shoulders', 'barbell', 'intermediate'),
('Dumbbell Press', 'Kurzhantel Drücken', 'Dumbbell Press', 'chest', 'dumbbell', 'beginner'),
('Pull-ups', 'Klimmzüge', 'Pull-ups', 'lats', 'bodyweight', 'intermediate'),
('Push-ups', 'Liegestütze', 'Push-ups', 'chest', 'bodyweight', 'beginner'),
('Dips', 'Dips', 'Dips', 'triceps', 'bodyweight', 'intermediate'),
('Leg Press', 'Beinpresse', 'Leg Press', 'quadriceps', 'machine', 'beginner'),
('Leg Curl', 'Beinbeuger', 'Leg Curl', 'hamstrings', 'machine', 'beginner'),
('Calf Raise', 'Wadenheben', 'Calf Raise', 'calves', 'machine', 'beginner'),
('Bicep Curl', 'Bizeps Curl', 'Bicep Curl', 'biceps', 'dumbbell', 'beginner'),
('Tricep Extension', 'Trizeps Strecken', 'Tricep Extension', 'triceps', 'dumbbell', 'beginner');

-- Add trigger for updated_at
CREATE TRIGGER update_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_sessions_updated_at
BEFORE UPDATE ON public.training_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();