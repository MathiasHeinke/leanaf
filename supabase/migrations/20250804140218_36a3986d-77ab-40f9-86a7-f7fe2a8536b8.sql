-- Create workout plan templates table for pre-built plans
CREATE TABLE public.workout_plan_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Push', 'Pull', 'Legs', 'Full Body', 'Cardio'
  description TEXT,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  estimated_duration_minutes INTEGER,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_plan_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view public workout templates" 
ON public.workout_plan_templates 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Super admins can manage workout templates" 
ON public.workout_plan_templates 
FOR ALL 
USING (is_super_admin());

-- Insert pre-built templates
INSERT INTO public.workout_plan_templates (name, category, description, difficulty_level, estimated_duration_minutes, exercises) VALUES
('Push Day - Beginner', 'Push', 'Grundlegendes Push-Training für Anfänger', 1, 45, '[
  {"name": "Bankdrücken", "sets": 3, "reps": "8-12", "weight_percentage": 75, "rpe": 7, "rest_seconds": 120, "muscle_groups": ["chest", "triceps", "shoulders"]},
  {"name": "Schulterdrücken", "sets": 3, "reps": "8-12", "weight_percentage": 70, "rpe": 7, "rest_seconds": 90, "muscle_groups": ["shoulders", "triceps"]},
  {"name": "Liegestütze", "sets": 3, "reps": "10-15", "weight_percentage": 0, "rpe": 6, "rest_seconds": 60, "muscle_groups": ["chest", "triceps"]},
  {"name": "Seitenheben", "sets": 3, "reps": "12-15", "weight_percentage": 40, "rpe": 6, "rest_seconds": 60, "muscle_groups": ["shoulders"]}
]'::jsonb),

('Pull Day - Beginner', 'Pull', 'Grundlegendes Pull-Training für Anfänger', 1, 45, '[
  {"name": "Latzug", "sets": 3, "reps": "8-12", "weight_percentage": 70, "rpe": 7, "rest_seconds": 120, "muscle_groups": ["lats", "biceps"]},
  {"name": "Rudern am Kabel", "sets": 3, "reps": "8-12", "weight_percentage": 70, "rpe": 7, "rest_seconds": 90, "muscle_groups": ["rhomboids", "lats", "biceps"]},
  {"name": "Kreuzheben", "sets": 3, "reps": "6-8", "weight_percentage": 80, "rpe": 8, "rest_seconds": 180, "muscle_groups": ["hamstrings", "glutes", "back"]},
  {"name": "Bizeps Curls", "sets": 3, "reps": "10-15", "weight_percentage": 60, "rpe": 6, "rest_seconds": 60, "muscle_groups": ["biceps"]}
]'::jsonb),

('Leg Day - Beginner', 'Legs', 'Grundlegendes Bein-Training für Anfänger', 1, 50, '[
  {"name": "Kniebeugen", "sets": 3, "reps": "8-12", "weight_percentage": 75, "rpe": 7, "rest_seconds": 180, "muscle_groups": ["quadriceps", "glutes"]},
  {"name": "Rumänisches Kreuzheben", "sets": 3, "reps": "10-12", "weight_percentage": 70, "rpe": 7, "rest_seconds": 120, "muscle_groups": ["hamstrings", "glutes"]},
  {"name": "Beinpresse", "sets": 3, "reps": "12-15", "weight_percentage": 80, "rpe": 6, "rest_seconds": 90, "muscle_groups": ["quadriceps", "glutes"]},
  {"name": "Wadenheben", "sets": 3, "reps": "15-20", "weight_percentage": 60, "rpe": 6, "rest_seconds": 60, "muscle_groups": ["calves"]}
]'::jsonb),

('Full Body - Beginner', 'Full Body', 'Komplettes Ganzkörper-Training für Anfänger', 1, 60, '[
  {"name": "Kniebeugen", "sets": 3, "reps": "10-12", "weight_percentage": 70, "rpe": 6, "rest_seconds": 120, "muscle_groups": ["quadriceps", "glutes"]},
  {"name": "Bankdrücken", "sets": 3, "reps": "8-10", "weight_percentage": 70, "rpe": 7, "rest_seconds": 120, "muscle_groups": ["chest", "triceps"]},
  {"name": "Rudern", "sets": 3, "reps": "8-10", "weight_percentage": 70, "rpe": 7, "rest_seconds": 120, "muscle_groups": ["lats", "rhomboids"]},
  {"name": "Schulterdrücken", "sets": 2, "reps": "8-10", "weight_percentage": 65, "rpe": 6, "rest_seconds": 90, "muscle_groups": ["shoulders"]},
  {"name": "Plank", "sets": 3, "reps": "30-60s", "weight_percentage": 0, "rpe": 6, "rest_seconds": 60, "muscle_groups": ["core"]}
]'::jsonb),

('Cardio Basic', 'Cardio', 'Grundlegendes Cardio-Training', 1, 30, '[
  {"name": "Laufband/Joggen", "sets": 1, "reps": "20-30 Min", "weight_percentage": 0, "rpe": 6, "rest_seconds": 0, "muscle_groups": ["cardiovascular"]},
  {"name": "Fahrrad", "sets": 1, "reps": "15-25 Min", "weight_percentage": 0, "rpe": 5, "rest_seconds": 0, "muscle_groups": ["cardiovascular", "legs"]},
  {"name": "Burpees", "sets": 3, "reps": "8-12", "weight_percentage": 0, "rpe": 7, "rest_seconds": 90, "muscle_groups": ["full_body"]}
]'::jsonb);

-- Update trigger for templates
CREATE OR REPLACE FUNCTION update_workout_plan_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workout_plan_templates_updated_at
  BEFORE UPDATE ON public.workout_plan_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_workout_plan_templates_updated_at();