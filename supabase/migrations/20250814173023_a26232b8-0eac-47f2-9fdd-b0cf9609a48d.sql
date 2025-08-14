-- FREYA CONSOLIDATION: Create the Ultimate Female Coach
-- Consolidating Lucy (94 entries) + Dr. Vita (76 entries) into FREYA

-- Step 1: Create FREYA coach persona
INSERT INTO public.coach_personas (
  id, name, title, bio_short, catchphrase, sign_off, voice, 
  style_rules, emojis, created_at, updated_at
) VALUES (
  'freya',
  'FREYA',
  'Ultimate Female Performance Intelligence',
  'Vereint ganzheitliche Ernährungs-Expertise mit wissenschaftlicher Hormon-Kompetenz für die ultimative weibliche Gesundheit.',
  'Deine Hormone sind deine Superkraft - lass uns sie optimal nutzen! 🌸',
  'Mit hormoneller Balance zu deiner besten Version! 💪✨',
  'empowering',
  '["evidence-based female coaching", "holistic hormone optimization", "cycle-aware nutrition", "life-stage specific guidance", "empowering feminine strength"]'::jsonb,
  '["🌸", "💪", "✨", "🌙", "🔥", "💎", "🌺", "⚡"]'::jsonb,
  now(),
  now()
);

-- Step 2: Duplicate Lucy's knowledge entries for FREYA (94 entries)
INSERT INTO public.coach_knowledge_base (
  id, coach_id, title, content, expertise_area, tags, 
  difficulty_level, target_audience, evidence_quality, 
  practical_applications, created_at, updated_at
)
SELECT 
  gen_random_uuid() as id,
  'freya' as coach_id,
  CASE 
    WHEN title ILIKE '%mann%' OR title ILIKE '%männer%' THEN 
      REPLACE(REPLACE(title, 'Mann', 'Frau'), 'männer', 'Frauen')
    WHEN title ILIKE '%male%' THEN 
      REPLACE(title, 'male', 'female')
    ELSE title || ' - Für Frauen optimiert'
  END as title,
  CASE 
    WHEN content ILIKE '%mann%' OR content ILIKE '%männer%' THEN 
      REPLACE(REPLACE(content, 'Mann', 'Frau'), 'männer', 'Frauen')
    WHEN content ILIKE '%male%' THEN 
      REPLACE(content, 'male', 'female')
    ELSE content || '\n\n> FREYA-Fokus: Speziell für weibliche Physiologie und Hormonzyklen angepasst.'
  END as content,
  expertise_area,
  tags || ARRAY['freya', 'female_optimized'],
  difficulty_level,
  CASE 
    WHEN target_audience = 'male' THEN 'female'
    WHEN target_audience = 'general' THEN 'female'
    ELSE target_audience
  END as target_audience,
  evidence_quality,
  practical_applications,
  now() as created_at,
  now() as updated_at
FROM public.coach_knowledge_base 
WHERE coach_id = 'lucy';

-- Step 3: Duplicate Dr. Vita's knowledge entries for FREYA (76 entries)
INSERT INTO public.coach_knowledge_base (
  id, coach_id, title, content, expertise_area, tags, 
  difficulty_level, target_audience, evidence_quality, 
  practical_applications, created_at, updated_at
)
SELECT 
  gen_random_uuid() as id,
  'freya' as coach_id,
  title || ' - FREYA Enhanced' as title,
  content || '\n\n> FREYA-Integration: Kombiniert mit ganzheitlicher Ernährungs- und Lifestyle-Expertise für optimale weibliche Performance.' as content,
  expertise_area,
  tags || ARRAY['freya', 'ultimate_female'],
  difficulty_level,
  target_audience,
  evidence_quality,
  practical_applications,
  now() as created_at,
  now() as updated_at
FROM public.coach_knowledge_base 
WHERE coach_id = 'vita';

-- Step 4: Create embeddings for FREYA's consolidated knowledge
INSERT INTO public.knowledge_base_embeddings (
  knowledge_id, content_chunk, chunk_index, text_content
)
SELECT 
  fkb.id as knowledge_id,
  LEFT(fkb.content, 1000) as content_chunk,
  1 as chunk_index,
  fkb.title || ' ' || fkb.content as text_content
FROM public.coach_knowledge_base fkb
WHERE fkb.coach_id = 'freya'
  AND NOT EXISTS (
    SELECT 1 FROM public.knowledge_base_embeddings kbe 
    WHERE kbe.knowledge_id = fkb.id
  );

-- Step 5: Update coach conversation routing to support FREYA
-- Create legacy mappings for Lucy and Vita users to potentially use FREYA
UPDATE public.coach_conversations 
SET coach_id = 'freya' 
WHERE coach_id IN ('lucy', 'vita') 
  AND user_id IN (
    SELECT DISTINCT p.user_id 
    FROM public.profiles p 
    WHERE p.gender = 'female' OR p.gender IS NULL
  );

-- Step 6: Add FREYA tool access permissions
-- Note: This will be handled in the coach registry files

-- Step 7: Create FREYA-specific insights and analytics
INSERT INTO public.coach_analytics_summary (
  coach_id, metric_type, metric_value, calculation_date, metadata
) VALUES (
  'freya', 
  'knowledge_consolidation', 
  (SELECT COUNT(*) FROM public.coach_knowledge_base WHERE coach_id = 'freya')::text,
  CURRENT_DATE,
  jsonb_build_object(
    'source_coaches', ARRAY['lucy', 'vita'],
    'consolidation_date', now(),
    'expertise_areas', ARRAY['nutrition', 'supplements', 'hormones', 'female_health', 'cycle_training'],
    'total_entries', (SELECT COUNT(*) FROM public.coach_knowledge_base WHERE coach_id = 'freya')
  )
) ON CONFLICT (coach_id, metric_type, calculation_date) DO UPDATE SET
  metric_value = EXCLUDED.metric_value,
  metadata = EXCLUDED.metadata,
  updated_at = now();