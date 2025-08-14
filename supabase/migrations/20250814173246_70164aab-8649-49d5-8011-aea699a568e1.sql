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

-- Step 5: Create FREYA search function (female-optimized version)
CREATE OR REPLACE FUNCTION public.search_freya_knowledge_ultimate(
  query_text text,
  query_embedding extensions.vector,
  user_context jsonb DEFAULT '{}'::jsonb,
  semantic_weight numeric DEFAULT 0.7,
  text_weight numeric DEFAULT 0.3,
  match_count integer DEFAULT 8
)
RETURNS TABLE(
  knowledge_id uuid,
  content_chunk text,
  combined_score numeric,
  semantic_score numeric,
  text_score numeric,
  title text,
  expertise_area text,
  coach_id text,
  female_optimization_boost numeric,
  lifecycle_relevance numeric
)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
  WITH female_health_domains AS (
    SELECT unnest(ARRAY[
      'hormone', 'zyklus', 'östrogen', 'progesteron', 'menstruation',
      'schwangerschaft', 'wechseljahre', 'pcos', 'endometriose',
      'eisenmangel', 'kalzium', 'folsäure', 'vitamin_d', 'magnesium',
      'stress', 'schlaf', 'cortisol', 'schilddrüse', 'metabolism',
      'krafttraining', 'cardio', 'flexibility', 'recovery', 'nutrition',
      'supplements', 'longevity', 'mindfulness', 'lifestyle'
    ]) AS domain
  ),
  enhanced_query AS (
    SELECT 
      query_text || ' ' || 
      COALESCE((user_context->>'cycle_phase')::text, '') || ' ' ||
      COALESCE((user_context->>'age_group')::text, '') || ' ' ||
      COALESCE((user_context->>'health_goals')::text, '') AS enhanced_text
  ),
  semantic_results AS (
    SELECT 
      ke.knowledge_id,
      ke.content_chunk,
      1 - (ke.embedding <=> query_embedding) AS semantic_score,
      kb.title,
      kb.expertise_area,
      kb.coach_id
    FROM public.knowledge_base_embeddings ke
    JOIN public.coach_knowledge_base kb ON ke.knowledge_id = kb.id
    WHERE kb.coach_id = 'freya'
  ),
  text_results AS (
    SELECT 
      kb.id as knowledge_id,
      ke.content_chunk,
      ts_rank_cd(
        to_tsvector('german', ke.content_chunk),
        plainto_tsquery('german', eq.enhanced_text)
      ) AS text_score,
      kb.title,
      kb.expertise_area,
      kb.coach_id
    FROM public.coach_knowledge_base kb
    JOIN public.knowledge_base_embeddings ke ON kb.id = ke.knowledge_id
    CROSS JOIN enhanced_query eq
    WHERE 
      kb.coach_id = 'freya'
      AND to_tsvector('german', ke.content_chunk) @@ plainto_tsquery('german', eq.enhanced_text)
  ),
  female_optimization_scoring AS (
    SELECT 
      COALESCE(s.knowledge_id, t.knowledge_id) as knowledge_id,
      COALESCE(s.content_chunk, t.content_chunk) as content_chunk,
      -- Female health domain coverage
      (
        SELECT COUNT(*)::numeric 
        FROM female_health_domains fhd 
        WHERE COALESCE(s.content_chunk, t.content_chunk) ILIKE '%' || fhd.domain || '%'
      ) / 28.0 AS domain_coverage_score,
      
      -- Lifecycle stage relevance
      CASE 
        WHEN (user_context->>'age')::int < 25 THEN
          CASE WHEN COALESCE(s.content_chunk, t.content_chunk) ILIKE '%pubertät%' OR 
                    COALESCE(s.content_chunk, t.content_chunk) ILIKE '%young%' THEN 0.15 ELSE 0.0 END
        WHEN (user_context->>'age')::int BETWEEN 25 AND 40 THEN
          CASE WHEN COALESCE(s.content_chunk, t.content_chunk) ILIKE '%fruchtbar%' OR 
                    COALESCE(s.content_chunk, t.content_chunk) ILIKE '%schwangerschaft%' THEN 0.15 ELSE 0.0 END
        WHEN (user_context->>'age')::int > 40 THEN
          CASE WHEN COALESCE(s.content_chunk, t.content_chunk) ILIKE '%wechseljahr%' OR 
                    COALESCE(s.content_chunk, t.content_chunk) ILIKE '%menopause%' THEN 0.15 ELSE 0.0 END
        ELSE 0.0
      END AS lifecycle_score
    FROM semantic_results s
    FULL OUTER JOIN text_results t ON s.knowledge_id = t.knowledge_id AND s.content_chunk = t.content_chunk
  )
  SELECT 
    COALESCE(s.knowledge_id, t.knowledge_id) as knowledge_id,
    COALESCE(s.content_chunk, t.content_chunk) as content_chunk,
    (
      COALESCE(s.semantic_score, 0) * semantic_weight + 
      COALESCE(t.text_score, 0) * text_weight +
      fos.domain_coverage_score * 0.15 + -- Female domain bonus
      fos.lifecycle_score * 0.1 -- Lifecycle relevance bonus
    ) as combined_score,
    COALESCE(s.semantic_score, 0) as semantic_score,
    COALESCE(t.text_score, 0) as text_score,
    COALESCE(s.title, t.title) as title,
    COALESCE(s.expertise_area, t.expertise_area) as expertise_area,
    COALESCE(s.coach_id, t.coach_id) as coach_id,
    fos.domain_coverage_score as female_optimization_boost,
    fos.lifecycle_score as lifecycle_relevance
  FROM semantic_results s
  FULL OUTER JOIN text_results t ON s.knowledge_id = t.knowledge_id AND s.content_chunk = t.content_chunk
  JOIN female_optimization_scoring fos ON fos.knowledge_id = COALESCE(s.knowledge_id, t.knowledge_id)
  WHERE 
    (s.semantic_score > 0.5 OR t.text_score > 0.1 OR fos.domain_coverage_score > 0.1)
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;