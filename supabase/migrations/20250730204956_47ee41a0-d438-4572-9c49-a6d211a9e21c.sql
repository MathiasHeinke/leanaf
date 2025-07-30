-- Add supplement recognition functionality to supplement_database
-- Add an optional image_url field for supplement reference images
ALTER TABLE public.supplement_database 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS recognition_keywords TEXT[];

-- Create supplement_recognition_log table to track recognition results
CREATE TABLE IF NOT EXISTS public.supplement_recognition_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  recognized_supplements JSONB NOT NULL DEFAULT '[]',
  analysis_result TEXT,
  confidence_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on supplement_recognition_log
ALTER TABLE public.supplement_recognition_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for supplement_recognition_log
CREATE POLICY "Users can create their own supplement recognition logs"
  ON public.supplement_recognition_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own supplement recognition logs"
  ON public.supplement_recognition_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add updated_at trigger for supplement_recognition_log
CREATE TRIGGER update_supplement_recognition_log_updated_at
  BEFORE UPDATE ON public.supplement_recognition_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();