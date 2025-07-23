-- Gib Mathias Heinke 12 Monate Premium
-- Suche nach User mit ähnlichem Namen/Email und update subscription
UPDATE public.subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Premium',
  subscription_end = (now() + interval '12 months'),
  updated_at = now()
WHERE email ILIKE '%mathias%' AND email ILIKE '%heinke%';