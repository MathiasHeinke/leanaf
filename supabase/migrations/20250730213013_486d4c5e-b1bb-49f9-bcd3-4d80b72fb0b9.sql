-- Create table for body analysis logging
CREATE TABLE IF NOT EXISTS public.body_analysis_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.body_analysis_log ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own body analysis logs" 
ON public.body_analysis_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own body analysis logs" 
ON public.body_analysis_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_body_analysis_log_user_id ON public.body_analysis_log(user_id);
CREATE INDEX idx_body_analysis_log_created_at ON public.body_analysis_log(created_at DESC);