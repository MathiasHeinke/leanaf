-- Create a table for storing supplement analysis cache
CREATE TABLE public.supplement_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplement_combination_hash TEXT NOT NULL,
  analysis_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, supplement_combination_hash)
);

-- Enable Row Level Security
ALTER TABLE public.supplement_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own supplement analyses" 
ON public.supplement_analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own supplement analyses" 
ON public.supplement_analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own supplement analyses" 
ON public.supplement_analyses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own supplement analyses" 
ON public.supplement_analyses 
FOR DELETE 
USING (auth.uid() = user_id);