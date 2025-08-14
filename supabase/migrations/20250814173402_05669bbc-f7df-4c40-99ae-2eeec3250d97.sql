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
  id, coach_id, knowledge_type, title, content, expertise_area, tags, 
  priority_level, source_url, scientific_paper_doi, created_at, updated_at
)
SELECT 
  gen_random_uuid() as id,
  'freya' as coach_id,
  knowledge_type,
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
  priority_level,
  source_url,
  scientific_paper_doi,
  now() as created_at,
  now() as updated_at
FROM public.coach_knowledge_base 
WHERE coach_id = 'lucy';

-- Step 3: Duplicate Dr. Vita's knowledge entries for FREYA (76 entries)
INSERT INTO public.coach_knowledge_base (
  id, coach_id, knowledge_type, title, content, expertise_area, tags, 
  priority_level, source_url, scientific_paper_doi, created_at, updated_at
)
SELECT 
  gen_random_uuid() as id,
  'freya' as coach_id,
  knowledge_type,
  title || ' - FREYA Enhanced' as title,
  content || '\n\n> FREYA-Integration: Kombiniert mit ganzheitlicher Ernährungs- und Lifestyle-Expertise für optimale weibliche Performance.' as content,
  expertise_area,
  tags || ARRAY['freya', 'ultimate_female'],
  priority_level,
  source_url,
  scientific_paper_doi,
  now() as created_at,
  now() as updated_at
FROM public.coach_knowledge_base 
WHERE coach_id = 'vita';

-- Step 4: Create embeddings for FREYA's consolidated knowledge
INSERT INTO public.knowledge_base_embeddings (
  knowledge_id, content_chunk, chunk_index, metadata
)
SELECT 
  fkb.id as knowledge_id,
  LEFT(fkb.content, 1000) as content_chunk,
  1 as chunk_index,
  jsonb_build_object(
    'title', fkb.title,
    'expertise_area', fkb.expertise_area,
    'source_coach', 'freya_consolidated',
    'female_optimized', true
  ) as metadata
FROM public.coach_knowledge_base fkb
WHERE fkb.coach_id = 'freya'
  AND NOT EXISTS (
    SELECT 1 FROM public.knowledge_base_embeddings kbe 
    WHERE kbe.knowledge_id = fkb.id
  );