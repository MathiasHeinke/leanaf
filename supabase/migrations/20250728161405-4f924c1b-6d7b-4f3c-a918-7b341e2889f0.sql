-- Create table for user tracking preferences
CREATE TABLE public.user_tracking_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tracking_type TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tracking_type)
);

-- Enable RLS
ALTER TABLE public.user_tracking_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tracking preferences" 
ON public.user_tracking_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tracking preferences" 
ON public.user_tracking_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracking preferences" 
ON public.user_tracking_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracking preferences" 
ON public.user_tracking_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_tracking_preferences_updated_at
BEFORE UPDATE ON public.user_tracking_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tracking types for existing users
INSERT INTO public.user_tracking_preferences (user_id, tracking_type, is_enabled, display_order)
SELECT 
  p.user_id,
  'meal_input',
  true,
  1
FROM public.profiles p
ON CONFLICT (user_id, tracking_type) DO NOTHING;

INSERT INTO public.user_tracking_preferences (user_id, tracking_type, is_enabled, display_order)
SELECT 
  p.user_id,
  tracking_type,
  false,
  display_order
FROM public.profiles p
CROSS JOIN (
  VALUES 
    ('weight_tracking', 2),
    ('sleep_tracking', 3),
    ('fluid_tracking', 4),
    ('workout_tracking', 5),
    ('supplement_tracking', 6)
) AS tracking_types(tracking_type, display_order)
ON CONFLICT (user_id, tracking_type) DO NOTHING;