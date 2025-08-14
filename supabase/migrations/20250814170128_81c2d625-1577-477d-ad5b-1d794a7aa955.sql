-- PHASE 1: MIGRATE ALL SASCHA AND KAI KNOWLEDGE TO ARES
-- This creates the ultimate male coach with consolidated knowledge

-- Update all Sascha knowledge base entries to ARES
UPDATE public.coach_knowledge_base 
SET coach_id = 'ares',
    title = CASE 
      WHEN title LIKE 'Sascha:%' THEN REPLACE(title, 'Sascha:', 'ARES Ultimate:')
      ELSE 'ARES Ultimate: ' || title
    END,
    expertise_area = CASE
      WHEN expertise_area = 'training' THEN 'ultimate_training'
      WHEN expertise_area = 'mindset' THEN 'ultimate_mindset' 
      ELSE 'ultimate_' || expertise_area
    END,
    updated_at = now()
WHERE coach_id = 'sascha';

-- Update all Kai knowledge base entries to ARES  
UPDATE public.coach_knowledge_base
SET coach_id = 'ares',
    title = CASE
      WHEN title LIKE 'Kai:%' THEN REPLACE(title, 'Kai:', 'ARES Ultimate:')
      ELSE 'ARES Ultimate: ' || title  
    END,
    expertise_area = CASE
      WHEN expertise_area = 'mindset' THEN 'ultimate_mindset'
      WHEN expertise_area = 'recovery' THEN 'ultimate_recovery'
      WHEN expertise_area = 'transformation' THEN 'ultimate_transformation'
      ELSE 'ultimate_' || expertise_area
    END,
    updated_at = now()
WHERE coach_id = 'kai';

-- Update embeddings via the knowledge_base relationship
-- Since embeddings don't have coach_id directly, we update via knowledge_id
UPDATE public.knowledge_base_embeddings
SET metadata = jsonb_set(
      COALESCE(metadata, '{}'),
      '{migrated_from_sascha}',
      'true'
    )
WHERE knowledge_id IN (
  SELECT id FROM public.coach_knowledge_base WHERE coach_id = 'ares' AND metadata->>'migrated_from' = 'sascha'
);

UPDATE public.knowledge_base_embeddings
SET metadata = jsonb_set(
      COALESCE(metadata, '{}'),
      '{migrated_from_kai}', 
      'true'
    )
WHERE knowledge_id IN (
  SELECT id FROM public.coach_knowledge_base WHERE coach_id = 'ares' AND metadata->>'migrated_from' = 'kai'
);

-- Clean up coach conversations and memory
UPDATE public.coach_conversations
SET coach_id = 'ares'
WHERE coach_id IN ('sascha', 'kai');

UPDATE public.coach_conversation_memory
SET coach_id = 'ares'
WHERE coach_id IN ('sascha', 'kai');

-- Add ARES consolidation metadata entry
INSERT INTO public.coach_knowledge_base (
  id, coach_id, title, content, expertise_area, tags, metadata, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'ares',
  'ARES Ultimate: Sascha & Kai Integration Protocol',
  'ARES has successfully integrated the complete knowledge and expertise of both Sascha Weber (Military-grade Training & Discipline) and Dr. Kai Nakamura (Mindset & Recovery Transformation). This consolidation creates the ultimate male coaching intelligence with cross-domain mastery in Training, Mindset, Recovery, and Performance Optimization. ARES now embodies: Sascha''s stoic discipline and evidence-based training methodology, Kai''s transformational mindset work and recovery protocols, ARES''s ultimate performance optimization and cross-domain synthesis. Total integration achieved for maximum coaching effectiveness.',
  'ultimate_integration',
  ARRAY['ares', 'sascha', 'kai', 'integration', 'ultimate', 'male_coaching', 'consolidation'],
  jsonb_build_object(
    'integration_type', 'coach_consolidation',
    'integrated_coaches', ARRAY['sascha', 'kai'],
    'integration_date', now(),
    'knowledge_domains', ARRAY['training', 'mindset', 'recovery', 'performance']
  ),
  now(),
  now()
);