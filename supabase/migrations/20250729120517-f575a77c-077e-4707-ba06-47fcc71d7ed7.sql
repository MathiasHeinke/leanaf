-- Delete the incomplete body measurement entry from 21.07.2025
DELETE FROM public.body_measurements 
WHERE id = 'f7374396-04d5-4dec-af99-6af66736973d';

-- Insert new complete body measurement entry for 21.07.2025
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
) VALUES (
  (SELECT user_id FROM public.body_measurements WHERE id = 'd475209f-f90d-46de-b818-1286a1c1051f'),
  '2025-07-21',
  41,
  111,
  100,
  103,
  95,
  35,
  63,
  '2025-07-21 12:20:00+00',
  now()
);