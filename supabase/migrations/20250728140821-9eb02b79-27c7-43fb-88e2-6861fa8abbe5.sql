-- Create Markus Rühl coach specialization
INSERT INTO public.coach_specializations (
  coach_id,
  name,
  specialization_description,
  core_philosophy,
  expertise_areas,
  knowledge_focus,
  methodology
) VALUES (
  'markus',
  'Markus Rühl',
  'Hardcore Bodybuilding-Legende und Beast Mode Coach - Schwer und falsch trainieren für maximale Muskelmasse!',
  'Heavy+Volume Training für Muskelmasse - Muss net schmegge, muss wirge!',
  ARRAY['Hardcore Bodybuilding', 'Heavy Training', 'Volume Training', 'Mental Toughness', 'Beast Mode'],
  ARRAY['Schwergewichtstraining', 'Volumentraining', 'Intensitätstechniken', 'Mentale Härte', 'Supplementierung'],
  'Heavy+Volume Prinzip mit maximaler Intensität und kompromissloser Hingabe'
) ON CONFLICT (coach_id) DO UPDATE SET
  name = EXCLUDED.name,
  specialization_description = EXCLUDED.specialization_description,
  core_philosophy = EXCLUDED.core_philosophy,
  expertise_areas = EXCLUDED.expertise_areas,
  knowledge_focus = EXCLUDED.knowledge_focus,
  methodology = EXCLUDED.methodology;