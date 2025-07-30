-- Update Dr. Vita Femina's name to include her specialization in the title
-- This follows the same pattern as other coaches (Lucy, Kai, Integral)
UPDATE public.coach_specializations 
SET 
  name = 'Dr. Vita Femina - Hormon-Expertin',
  specialization_description = 'Spezialistin für Hormonbalance, Frauengesundheit und hormonelle Störungen. Unterstützt bei Wechseljahrsbeschwerden, PMS, PCOS und hormonellen Ungleichgewichten mit wissenschaftlich fundierten Methoden.',
  updated_at = now()
WHERE coach_id = 'dr-vita-femina';