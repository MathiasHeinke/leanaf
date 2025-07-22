
-- Gib allen existierenden Usern 12 Monate Premium kostenfrei
-- Erst schauen wir welche User existieren und fügen sie zur subscribers Tabelle hinzu falls nötig
INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end, updated_at)
SELECT 
  p.user_id,
  p.email,
  true,
  'Premium',
  (now() + interval '12 months'),
  now()
FROM public.profiles p
WHERE p.email IS NOT NULL
ON CONFLICT (email) 
DO UPDATE SET 
  subscribed = true,
  subscription_tier = 'Premium',
  subscription_end = (now() + interval '12 months'),
  updated_at = now();

-- Zusätzlich für User die bereits in subscribers sind aber noch keinen Premium haben
UPDATE public.subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Premium',
  subscription_end = (now() + interval '12 months'),
  updated_at = now()
WHERE subscribed = false OR subscription_tier IS NULL OR subscription_tier != 'Premium';
