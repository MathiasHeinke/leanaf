-- Create monthly challenges table for Lucy's gamification system
CREATE TABLE IF NOT EXISTS public.monthly_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(year FROM now()),
  progress INTEGER DEFAULT 0,
  target INTEGER DEFAULT 30,
  challenge_type TEXT DEFAULT 'hydration',
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.monthly_challenges ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly challenges
CREATE POLICY "Users can view their own challenges" 
ON public.monthly_challenges 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own challenges" 
ON public.monthly_challenges 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own challenges" 
ON public.monthly_challenges 
FOR UPDATE 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own challenges" 
ON public.monthly_challenges 
FOR DELETE 
USING (auth.uid()::text = user_id::text);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_monthly_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_monthly_challenges_updated_at
BEFORE UPDATE ON public.monthly_challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_monthly_challenges_updated_at();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_challenges_user_month ON public.monthly_challenges(user_id, month, year);
CREATE INDEX IF NOT EXISTS idx_monthly_challenges_active ON public.monthly_challenges(user_id, is_completed) WHERE is_completed = false;