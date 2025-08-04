-- Create daily_activities table for step tracking and daily activity data
CREATE TABLE public.daily_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  steps INTEGER DEFAULT 0,
  distance_km NUMERIC(6,2) DEFAULT 0,
  calories_burned INTEGER DEFAULT 0,
  activity_minutes INTEGER DEFAULT 0,
  floors_climbed INTEGER DEFAULT 0,
  heart_rate_avg INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own daily activities" 
ON public.daily_activities 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily activities" 
ON public.daily_activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily activities" 
ON public.daily_activities 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily activities" 
ON public.daily_activities 
FOR DELETE 
USING (auth.uid() = user_id);

-- Coaches can view daily activities for coaching
CREATE POLICY "Coaches can view daily activities for coaching" 
ON public.daily_activities 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.user_id = daily_activities.user_id
  ) OR 
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_activities_updated_at
BEFORE UPDATE ON public.daily_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-fill date trigger
CREATE TRIGGER daily_activities_autofill_date 
BEFORE INSERT ON public.daily_activities 
FOR EACH ROW 
EXECUTE FUNCTION public._autofill_date();