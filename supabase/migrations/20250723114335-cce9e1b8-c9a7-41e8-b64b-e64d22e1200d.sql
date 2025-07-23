
-- Gib office@mathiasheinke.de Enterprise-Status für 12 Monate
UPDATE public.subscribers 
SET 
  subscribed = true,
  subscription_tier = 'Enterprise',
  subscription_end = (now() + interval '12 months'),
  updated_at = now()
WHERE email = 'office@mathiasheinke.de';

-- Falls kein Eintrag existiert, erstelle einen neuen
INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end, updated_at)
SELECT 
  '84b0664f-0934-49ce-9c35-c99546b792bf'::uuid,
  'office@mathiasheinke.de',
  true,
  'Enterprise',
  (now() + interval '12 months'),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscribers WHERE email = 'office@mathiasheinke.de'
);
