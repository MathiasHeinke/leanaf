-- Create trigger function to initialize tracking preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_tracking_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Insert default tracking preferences for new user
  INSERT INTO public.user_tracking_preferences (user_id, tracking_type, is_enabled, display_order)
  VALUES 
    (NEW.id, 'meal_input', true, 1),
    (NEW.id, 'weight_tracking', false, 2),
    (NEW.id, 'sleep_tracking', false, 3),
    (NEW.id, 'fluid_tracking', false, 4),
    (NEW.id, 'workout_tracking', false, 5),
    (NEW.id, 'supplement_tracking', false, 6);
  
  RETURN NEW;
END;
$function$;

-- Create trigger that fires after user creation
DROP TRIGGER IF EXISTS on_auth_user_created_tracking_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_tracking_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_tracking_preferences();