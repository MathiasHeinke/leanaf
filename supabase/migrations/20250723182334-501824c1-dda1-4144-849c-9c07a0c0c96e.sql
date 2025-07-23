-- Grant unlimited Premium access to mi.brandl
UPDATE public.subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Premium',
  subscription_end = (now() + interval '10 years'),
  updated_at = now()
WHERE email ILIKE '%mi.brandl%';

-- Create record if it doesn't exist
INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end, updated_at)
SELECT 
  NULL,
  'mi.brandl@example.com',
  true,
  'Premium',
  (now() + interval '10 years'),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscribers WHERE email ILIKE '%mi.brandl%'
);