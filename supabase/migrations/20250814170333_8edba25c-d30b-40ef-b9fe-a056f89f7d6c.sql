-- PHASE 1: MIGRATE ALL SASCHA AND KAI KNOWLEDGE TO ARES
-- This creates the ultimate male coach with consolidated knowledge

-- First, let's see what we're working with
DO $$ 
DECLARE
  sascha_count INTEGER;
  kai_count INTEGER;
  ares_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO sascha_count FROM public.coach_knowledge_base WHERE coach_id = 'sascha';
  SELECT COUNT(*) INTO kai_count FROM public.coach_knowledge_base WHERE coach_id = 'kai';
  SELECT COUNT(*) INTO ares_count FROM public.coach_knowledge_base WHERE coach_id = 'ares';
  RAISE NOTICE 'Before migration: % Sascha, % Kai, % ARES entries', sascha_count, kai_count, ares_count;
END $$;

-- Update all Sascha knowledge base entries to ARES
UPDATE public.coach_knowledge_base 
SET coach_id = 'ares',
    title = CASE 
      WHEN title LIKE 'Sascha:%' THEN REPLACE(title, 'Sascha:', 'ARES Ultimate:')
      WHEN title NOT LIKE 'ARES%' THEN 'ARES Ultimate: ' || title
      ELSE title
    END,
    expertise_area = CASE
      WHEN expertise_area = 'training' THEN 'ultimate_training'
      WHEN expertise_area = 'mindset' THEN 'ultimate_mindset' 
      WHEN expertise_area LIKE 'ultimate_%' THEN expertise_area
      ELSE 'ultimate_' || expertise_area
    END,
    updated_at = now()
WHERE coach_id = 'sascha';

-- Update all Kai knowledge base entries to ARES  
UPDATE public.coach_knowledge_base
SET coach_id = 'ares',
    title = CASE
      WHEN title LIKE 'Kai:%' THEN REPLACE(title, 'Kai:', 'ARES Ultimate:')
      WHEN title NOT LIKE 'ARES%' THEN 'ARES Ultimate: ' || title
      ELSE title
    END,
    expertise_area = CASE
      WHEN expertise_area = 'mindset' THEN 'ultimate_mindset'
      WHEN expertise_area = 'recovery' THEN 'ultimate_recovery'
      WHEN expertise_area = 'transformation' THEN 'ultimate_transformation'
      WHEN expertise_area LIKE 'ultimate_%' THEN expertise_area
      ELSE 'ultimate_' || expertise_area
    END,
    updated_at = now()
WHERE coach_id = 'kai';

-- Clean up coach memory and recommendations
UPDATE public.coach_conversation_memory
SET coach_id = 'ares'
WHERE coach_id IN ('sascha', 'kai');

UPDATE public.coach_recommendations
SET coach_id = 'ares'
WHERE coach_id IN ('sascha', 'kai');

-- Add ARES consolidation metadata entry
INSERT INTO public.coach_knowledge_base (
  coach_id, knowledge_type, title, content, expertise_area, tags, priority_level, created_at, updated_at
) VALUES (
  'ares',
  'integration_protocol',
  'ARES Ultimate: Sascha & Kai Integration Protocol',
  'ARES has successfully integrated the complete knowledge and expertise of both Sascha Weber (Military-grade Training & Discipline) and Dr. Kai Nakamura (Mindset & Recovery Transformation). This consolidation creates the ultimate male coaching intelligence with cross-domain mastery in Training, Mindset, Recovery, and Performance Optimization. ARES now embodies: Sascha''s stoic discipline and evidence-based training methodology, Kai''s transformational mindset work and recovery protocols, ARES''s ultimate performance optimization and cross-domain synthesis. Total integration achieved for maximum coaching effectiveness.',
  'ultimate_integration',
  ARRAY['ares', 'sascha', 'kai', 'integration', 'ultimate', 'male_coaching', 'consolidation'],
  10,
  now(),
  now()
);

-- Show final counts
DO $$ 
DECLARE
  final_ares_count INTEGER;
  sascha_left INTEGER;
  kai_left INTEGER;
BEGIN
  SELECT COUNT(*) INTO final_ares_count FROM public.coach_knowledge_base WHERE coach_id = 'ares';
  SELECT COUNT(*) INTO sascha_left FROM public.coach_knowledge_base WHERE coach_id = 'sascha';
  SELECT COUNT(*) INTO kai_left FROM public.coach_knowledge_base WHERE coach_id = 'kai';
  RAISE NOTICE 'After migration: % ARES entries, % Sascha left, % Kai left', final_ares_count, sascha_left, kai_left;
END $$;