-- Fix missing body measurements from 29.07.2025 using existing user_id
INSERT INTO public.body_measurements (
  user_id,
  date,
  neck,
  chest,
  waist,
  belly,
  hips,
  arms,
  thigh,
  created_at,
  updated_at
) 
SELECT DISTINCT 
  user_id,
  '2025-07-29'::date,
  41.0,
  113.0,
  100.0,
  103.0,
  95.0,
  35.0,
  63.0,
  '2025-07-29 12:00:00+02'::timestamptz,
  '2025-07-29 12:00:00+02'::timestamptz
FROM public.body_measurements 
WHERE user_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.body_measurements 
    WHERE date = '2025-07-29'::date 
      AND user_id = body_measurements.user_id
  )
LIMIT 1;