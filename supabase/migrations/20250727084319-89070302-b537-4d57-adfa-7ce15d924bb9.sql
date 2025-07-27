-- Create table for saved formcheck analyses
CREATE TABLE public.saved_formchecks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  coach_analysis TEXT NOT NULL,
  key_points TEXT[] NOT NULL DEFAULT '{}',
  form_rating INTEGER CHECK (form_rating >= 1 AND form_rating <= 10),
  improvement_tips TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_formchecks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own formchecks"
ON public.saved_formchecks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own formchecks"
ON public.saved_formchecks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own formchecks"
ON public.saved_formchecks
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own formchecks"
ON public.saved_formchecks
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_saved_formchecks_updated_at
BEFORE UPDATE ON public.saved_formchecks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();