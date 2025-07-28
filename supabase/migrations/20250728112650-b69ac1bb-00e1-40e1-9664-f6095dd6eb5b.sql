-- Pro-Subscription für office@mathiasheinke.de für 12 Monate vergeben

INSERT INTO public.subscribers (email, subscribed, subscription_tier, subscription_end, updated_at, created_at)
VALUES (
  'office@mathiasheinke.de',
  true,
  'Premium',
  (CURRENT_TIMESTAMP + INTERVAL '12 months')::timestamptz,
  now(),
  now()
)
ON CONFLICT (email) 
DO UPDATE SET
  subscribed = true,
  subscription_tier = 'Premium',
  subscription_end = (CURRENT_TIMESTAMP + INTERVAL '12 months')::timestamptz,
  updated_at = now();