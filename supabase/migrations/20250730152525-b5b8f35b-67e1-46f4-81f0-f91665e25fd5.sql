-- Create workout_plans table
CREATE TABLE public.workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN NOT NULL DEFAULT false,
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for workout_plans
CREATE POLICY "Users can view their own plans and public plans" 
ON public.workout_plans 
FOR SELECT 
USING (created_by = auth.uid() OR is_public = true);

CREATE POLICY "Users can create their own workout plans" 
ON public.workout_plans 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own workout plans" 
ON public.workout_plans 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own workout plans" 
ON public.workout_plans 
FOR DELETE 
USING (created_by = auth.uid());

-- Add workout_plan_id to exercise_sessions for linking
ALTER TABLE public.exercise_sessions ADD COLUMN workout_plan_id UUID REFERENCES public.workout_plans(id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_workout_plans_updated_at
BEFORE UPDATE ON public.workout_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();