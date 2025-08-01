-- Create function to automatically set local date based on timezone
CREATE OR REPLACE FUNCTION public.set_local_date()
RETURNS TRIGGER AS $$
DECLARE
  user_timezone TEXT := 'Europe/Berlin';
  profile_tz TEXT;
BEGIN
  -- Get user's timezone from profile if available
  SELECT timezone INTO profile_tz 
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  IF profile_tz IS NOT NULL THEN
    user_timezone := profile_tz;
  END IF;
  
  -- Set date field based on created_at/consumed_at in user's timezone
  IF TG_TABLE_NAME = 'meals' THEN
    NEW.date := (NEW.created_at AT TIME ZONE 'UTC' AT TIME ZONE user_timezone)::date;
  ELSIF TG_TABLE_NAME = 'user_fluids' THEN
    NEW.date := (NEW.consumed_at AT TIME ZONE 'UTC' AT TIME ZONE user_timezone)::date;
  ELSIF TG_TABLE_NAME = 'supplement_intake_log' THEN
    NEW.date := (NEW.taken_at AT TIME ZONE 'UTC' AT TIME ZONE user_timezone)::date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic date setting
CREATE TRIGGER meals_set_local_date
  BEFORE INSERT OR UPDATE ON public.meals
  FOR EACH ROW
  WHEN (NEW.date IS NULL)
  EXECUTE FUNCTION public.set_local_date();

CREATE TRIGGER user_fluids_set_local_date
  BEFORE INSERT OR UPDATE ON public.user_fluids
  FOR EACH ROW
  WHEN (NEW.date IS NULL)
  EXECUTE FUNCTION public.set_local_date();

CREATE TRIGGER supplement_intake_set_local_date
  BEFORE INSERT OR UPDATE ON public.supplement_intake_log
  FOR EACH ROW
  WHEN (NEW.date IS NULL)
  EXECUTE FUNCTION public.set_local_date();