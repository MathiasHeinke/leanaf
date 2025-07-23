-- Set Enterprise subscription for office@mathiasheinke.de
UPDATE public.subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Enterprise',
  subscription_end = (now() + interval '12 months'),
  updated_at = now()
WHERE email = 'office@mathiasheinke.de';

-- Create record if it doesn't exist
INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end, updated_at)
SELECT 
  NULL,
  'office@mathiasheinke.de',
  true,
  'Enterprise',
  (now() + interval '12 months'),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscribers WHERE email = 'office@mathiasheinke.de'
);