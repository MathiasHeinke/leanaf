-- Create strength_goals table
CREATE TABLE public.strength_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  current_1rm_kg NUMERIC,
  target_1rm_kg NUMERIC NOT NULL,
  estimated_weeks INTEGER,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create target_images table
CREATE TABLE public.target_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL CHECK (image_type IN ('uploaded', 'ai_generated')),
  target_weight_kg NUMERIC,
  target_body_fat_percentage NUMERIC,
  generation_prompt TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strength_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_images ENABLE ROW LEVEL SECURITY;

-- Create policies for strength_goals
CREATE POLICY "Users can view their own strength goals" 
ON public.strength_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strength goals" 
ON public.strength_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strength goals" 
ON public.strength_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strength goals" 
ON public.strength_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for target_images
CREATE POLICY "Users can view their own target images" 
ON public.target_images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own target images" 
ON public.target_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own target images" 
ON public.target_images 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own target images" 
ON public.target_images 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_strength_goals_updated_at
BEFORE UPDATE ON public.strength_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_target_images_updated_at
BEFORE UPDATE ON public.target_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();