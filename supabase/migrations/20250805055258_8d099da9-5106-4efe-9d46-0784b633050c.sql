-- Phase 1: Copy Sascha's training knowledge to Lucy (Fixed with knowledge_type)
INSERT INTO coach_knowledge_base (id, coach_id, knowledge_type, title, content, source_url, scientific_paper_doi, tags, expertise_area, priority_level, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,
  'lucy' as coach_id,
  COALESCE(knowledge_type, 'manual') as knowledge_type,
  title,
  content,
  source_url,
  scientific_paper_doi,
  tags,
  expertise_area,
  priority_level,
  now() as created_at,
  now() as updated_at
FROM coach_knowledge_base 
WHERE coach_id = 'sascha' 
  AND (expertise_area ILIKE '%training%' 
       OR expertise_area ILIKE '%kraft%' 
       OR expertise_area ILIKE '%muskel%'
       OR expertise_area = 'strength_training'
       OR expertise_area = 'periodization'
       OR expertise_area = 'movement_quality'
       OR expertise_area = 'tactical_periodization'
       OR expertise_area = 'metabolic_conditioning'
       OR expertise_area = 'performance_optimization'
       OR expertise_area = 'vo2max_training'
       OR expertise_area = 'heart_rate_training'
       OR expertise_area = 'military_conditioning');