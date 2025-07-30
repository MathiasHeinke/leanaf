-- Update Dr. Sophia Integral's name to be shorter like other coaches
-- Current: "Dr. Sophia Integral - Die Integrative Gesundheitsexpertin" 
-- New: "Dr. Sophia - Integraler Gesundheitsansatz"
UPDATE public.coach_specializations 
SET 
  name = 'Dr. Sophia - Integraler Gesundheitsansatz',
  specialization_description = 'Ganzheitliche Gesundheitsberatung mit Fokus auf die Integration von Körper, Geist und Seele. Unterstützt bei Stressmanagement, Work-Life-Balance und präventiver Medizin.',
  updated_at = now()
WHERE coach_id = 'integral';