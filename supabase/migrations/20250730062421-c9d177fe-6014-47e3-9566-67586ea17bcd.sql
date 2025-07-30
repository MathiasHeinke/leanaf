-- Update Markus Rühl's name to include "The German Beast" subtitle like other coaches
UPDATE public.coach_specializations 
SET name = 'Markus Rühl - The German Beast'
WHERE coach_id = 'markus' AND name = 'Markus Rühl';