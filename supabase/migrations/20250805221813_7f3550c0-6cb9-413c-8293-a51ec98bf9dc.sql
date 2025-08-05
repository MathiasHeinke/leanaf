-- Insert missing body measurements from 29.07.2025
INSERT INTO public.body_measurements (
  user_id,
  date,
  neck_cm,
  chest_cm,
  waist_cm,
  belly_cm,
  hips_cm,
  arms_cm,
  thighs_cm,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = (SELECT email FROM profiles WHERE user_id = auth.uid() LIMIT 1) LIMIT 1),
  '2025-07-29',
  41.0,
  113.0,
  100.0,
  103.0,
  95.0,
  35.0,
  63.0,
  '2025-07-29 12:00:00+02',
  '2025-07-29 12:00:00+02'
);

-- Add unique constraint to prevent future data overwrites
ALTER TABLE public.body_measurements 
ADD CONSTRAINT unique_user_date_measurements 
UNIQUE (user_id, date);