
-- Add hide_premium_features preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN hide_premium_features boolean DEFAULT false;

-- Create coach_recommendations table for weekly recommendations
CREATE TABLE public.coach_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  coach_id text NOT NULL,
  last_recommendation_sent timestamp with time zone DEFAULT now(),
  recommendation_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for coach_recommendations
ALTER TABLE public.coach_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coach recommendations" 
  ON public.coach_recommendations 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coach recommendations" 
  ON public.coach_recommendations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coach recommendations" 
  ON public.coach_recommendations 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_coach_recommendations_updated_at
  BEFORE UPDATE ON public.coach_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
