-- Step 1: Update all existing subscribers to 12-month Premium
UPDATE public.subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Premium',
  subscription_end = (CURRENT_TIMESTAMP + INTERVAL '12 months')::timestamptz,
  updated_at = now();

-- Step 2: Insert Premium subscriptions for users without subscription records
INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
SELECT 
  p.user_id,
  p.email,
  true,
  'Premium',
  (CURRENT_TIMESTAMP + INTERVAL '12 months')::timestamptz
FROM public.profiles p
WHERE p.user_id NOT IN (SELECT user_id FROM public.subscribers)
AND p.email IS NOT NULL;

-- Step 3: Create function to handle new user premium assignment
CREATE OR REPLACE FUNCTION public.handle_new_user_premium()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_users INTEGER;
BEGIN
  -- Count total registered users
  SELECT COUNT(*) INTO total_users FROM auth.users;
  
  -- If we have less than 50 users, give Premium for 12 months
  IF total_users <= 50 THEN
    -- Insert into subscribers table with Premium
    INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
    VALUES (
      NEW.id, 
      NEW.email, 
      true, 
      'Premium', 
      (CURRENT_TIMESTAMP + INTERVAL '12 months')::timestamptz
    );
    
    -- Log this premium assignment
    INSERT INTO public.admin_logs (admin_user_id, action_type, target_user_id, action_details)
    VALUES (
      NEW.id,
      'auto_premium_assigned',
      NEW.id,
      jsonb_build_object(
        'reason', 'new_user_under_50_limit',
        'total_users', total_users,
        'subscription_end', (CURRENT_TIMESTAMP + INTERVAL '12 months')::timestamptz
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger on auth.users for new registrations
DROP TRIGGER IF EXISTS on_auth_user_premium_assignment ON auth.users;
CREATE TRIGGER on_auth_user_premium_assignment
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_premium();