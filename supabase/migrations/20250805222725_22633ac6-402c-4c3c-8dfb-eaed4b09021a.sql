-- Insert missing body measurements from 29.07.2025 with correct column names
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
SELECT 
  auth.uid(),
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
WHERE auth.uid() IS NOT NULL;