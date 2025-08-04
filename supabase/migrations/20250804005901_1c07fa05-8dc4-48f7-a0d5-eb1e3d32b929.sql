-- Monthly Challenges System for Enhanced Lucy v2
-- Enables gamified monthly challenges with progress tracking

CREATE TABLE IF NOT EXISTS public.monthly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(year FROM now()),
  progress INTEGER DEFAULT 0,
  target INTEGER DEFAULT 30,
  is_completed BOOLEAN DEFAULT false,
  challenge_type TEXT DEFAULT 'hydration',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, month, year, challenge_type)
);

-- Enable RLS
ALTER TABLE public.monthly_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own challenges"
ON public.monthly_challenges
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update trigger
CREATE TRIGGER update_monthly_challenges_updated_at
  BEFORE UPDATE ON public.monthly_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default challenges for existing users
INSERT INTO public.monthly_challenges (user_id, challenge, month, challenge_type, target)
SELECT 
  u.id,
  'Trinke täglich 3L Wasser',
  EXTRACT(month FROM now())::INTEGER,
  'hydration',
  30
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.monthly_challenges mc 
  WHERE mc.user_id = u.id 
  AND mc.month = EXTRACT(month FROM now())::INTEGER
  AND mc.challenge_type = 'hydration'
)
LIMIT 20;