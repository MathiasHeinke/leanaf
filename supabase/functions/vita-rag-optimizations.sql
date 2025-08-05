-- Dr. Vita Femina RAG Performance Optimization
-- Enhanced knowledge base search functions for female health specialization

-- 1. Vita-Optimized Semantic Search with Life Stage Weighting
CREATE OR REPLACE FUNCTION public.search_vita_knowledge_semantic(
  query_embedding extensions.vector,
  user_age integer DEFAULT NULL,
  menopause_stage text DEFAULT NULL,
  cycle_phase text DEFAULT NULL,
  health_conditions text[] DEFAULT '{}',
  similarity_threshold numeric DEFAULT 0.6,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  knowledge_id uuid, 
  content_chunk text, 
  similarity numeric, 
  title text, 
  expertise_area text, 
  coach_id text, 
  chunk_index integer,
  life_stage_boost numeric,
  evidence_quality_score numeric
) 
LANGUAGE sql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
  WITH semantic_matches AS (
    SELECT 
      ke.knowledge_id,
      ke.content_chunk,
      1 - (ke.embedding <=> query_embedding) AS base_similarity,
      kb.title,
      kb.expertise_area,
      kb.coach_id,
      ke.chunk_index
    FROM public.knowledge_base_embeddings ke
    JOIN public.coach_knowledge_base kb ON ke.knowledge_id = kb.id
    WHERE 
      kb.coach_id = 'vita'
      AND 1 - (ke.embedding <=> query_embedding) > similarity_threshold
  ),
  vita_scored AS (
    SELECT 
      sm.*,
      -- Life stage relevance boost
      CASE 
        WHEN user_age IS NOT NULL THEN
          CASE 
            WHEN user_age < 25 AND (sm.title ILIKE '%pubertät%' OR sm.content_chunk ILIKE '%adoleszenz%') THEN 0.15
            WHEN user_age BETWEEN 25 AND 40 AND (sm.title ILIKE '%fruchtbar%' OR sm.content_chunk ILIKE '%zyklus%') THEN 0.12
            WHEN user_age > 45 AND (sm.title ILIKE '%menopause%' OR sm.content_chunk ILIKE '%wechseljahre%') THEN 0.15
            ELSE 0.0
          END
        ELSE 0.0
      END +
      -- Menopause stage boost
      CASE 
        WHEN menopause_stage IS NOT NULL AND (
          sm.content_chunk ILIKE '%' || menopause_stage || '%' OR 
          sm.title ILIKE '%' || menopause_stage || '%'
        ) THEN 0.1
        ELSE 0.0
      END +
      -- Cycle phase boost
      CASE 
        WHEN cycle_phase IS NOT NULL AND (
          sm.content_chunk ILIKE '%' || cycle_phase || '%' OR 
          sm.title ILIKE '%zyklus%'
        ) THEN 0.08
        ELSE 0.0
      END AS life_stage_boost,
      
      -- Evidence quality scoring
      CASE 
        WHEN sm.content_chunk ILIKE '%studie%' OR sm.content_chunk ILIKE '%research%' OR sm.title ILIKE '%evidenz%' THEN 1.0
        WHEN sm.content_chunk ILIKE '%leitlinien%' OR sm.content_chunk ILIKE '%empfehlung%' THEN 0.8
        WHEN sm.content_chunk ILIKE '%klinisch%' OR sm.content_chunk ILIKE '%therapie%' THEN 0.6
        ELSE 0.4
      END AS evidence_quality_score
    FROM semantic_matches sm
  )
  SELECT 
    vs.knowledge_id,
    vs.content_chunk,
    LEAST(1.0, vs.base_similarity + vs.life_stage_boost) as similarity,
    vs.title,
    vs.expertise_area,
    vs.coach_id,
    vs.chunk_index,
    vs.life_stage_boost,
    vs.evidence_quality_score
  FROM vita_scored vs
  ORDER BY 
    (vs.base_similarity + vs.life_stage_boost) DESC,
    vs.evidence_quality_score DESC
  LIMIT match_count;
$$;

-- 2. Vita Hybrid Search with Enhanced Female Health Keyword Matching
CREATE OR REPLACE FUNCTION public.search_vita_knowledge_hybrid(
  query_text text,
  query_embedding extensions.vector,
  user_context jsonb DEFAULT '{}',
  semantic_weight numeric DEFAULT 0.7,
  text_weight numeric DEFAULT 0.3,
  match_count integer DEFAULT 5
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
  vita_specialization_score numeric
) 
LANGUAGE sql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
  WITH female_health_terms AS (
    SELECT unnest(ARRAY[
      'zyklus', 'menstruation', 'ovulation', 'luteal', 'follikulär',
      'östrogen', 'progesteron', 'hormon', 'pms', 'menopause',
      'perimenopause', 'postmenopause', 'hitzewallungen', 'wechseljahre',
      'pcos', 'endometriose', 'schwangerschaft', 'rückbildung',
      'beckenboden', 'krafttraining weiblich', 'zyklusbasiert'
    ]) AS term
  ),
  enhanced_query AS (
    SELECT 
      query_text || ' ' || 
      COALESCE((user_context->>'cycle_phase')::text, '') || ' ' ||
      COALESCE((user_context->>'menopause_stage')::text, '') || ' ' ||
      CASE 
        WHEN (user_context->>'age')::int < 25 THEN 'junge frau'
        WHEN (user_context->>'age')::int > 45 THEN 'reife frau'
        ELSE ''
      END AS enhanced_text
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
    WHERE kb.coach_id = 'vita'
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
      kb.coach_id = 'vita'
      AND to_tsvector('german', ke.content_chunk) @@ plainto_tsquery('german', eq.enhanced_text)
  ),
  vita_specialization AS (
    SELECT 
      COALESCE(s.knowledge_id, t.knowledge_id) as knowledge_id,
      COALESCE(s.content_chunk, t.content_chunk) as content_chunk,
      -- Enhanced Vita specialization scoring
      (
        SELECT COUNT(*)::numeric 
        FROM female_health_terms fht 
        WHERE COALESCE(s.content_chunk, t.content_chunk) ILIKE '%' || fht.term || '%'
      ) / 20.0 AS specialization_score -- Normalize by total terms
    FROM semantic_results s
    FULL OUTER JOIN text_results t ON s.knowledge_id = t.knowledge_id AND s.content_chunk = t.content_chunk
  )
  SELECT 
    COALESCE(s.knowledge_id, t.knowledge_id) as knowledge_id,
    COALESCE(s.content_chunk, t.content_chunk) as content_chunk,
    (
      COALESCE(s.semantic_score, 0) * semantic_weight + 
      COALESCE(t.text_score, 0) * text_weight +
      vs.specialization_score * 0.1 -- Vita specialization bonus
    ) as combined_score,
    COALESCE(s.semantic_score, 0) as semantic_score,
    COALESCE(t.text_score, 0) as text_score,
    COALESCE(s.title, t.title) as title,
    COALESCE(s.expertise_area, t.expertise_area) as expertise_area,
    COALESCE(s.coach_id, t.coach_id) as coach_id,
    vs.specialization_score as vita_specialization_score
  FROM semantic_results s
  FULL OUTER JOIN text_results t ON s.knowledge_id = t.knowledge_id AND s.content_chunk = t.content_chunk
  JOIN vita_specialization vs ON vs.knowledge_id = COALESCE(s.knowledge_id, t.knowledge_id)
  WHERE 
    (s.semantic_score > 0.5 OR t.text_score > 0.1 OR vs.specialization_score > 0.1)
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;

-- 3. Vita Knowledge Quality Assessment Function
CREATE OR REPLACE FUNCTION public.assess_vita_knowledge_quality(
  knowledge_base_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  knowledge_record record;
  quality_metrics jsonb := '{}';
  evidence_score numeric := 0;
  recency_score numeric := 0;
  specialization_score numeric := 0;
  citation_count integer := 0;
BEGIN
  -- Get knowledge base entry
  SELECT * INTO knowledge_record 
  FROM coach_knowledge_base 
  WHERE id = knowledge_base_id AND coach_id = 'vita';
  
  IF NOT FOUND THEN
    RETURN '{"error": "Knowledge entry not found for Dr. Vita"}';
  END IF;
  
  -- Evidence quality assessment
  IF knowledge_record.content ~* '(studie|research|systematic review|meta-analysis|rct)' THEN
    evidence_score := evidence_score + 0.4;
  END IF;
  
  IF knowledge_record.content ~* '(leitlinien|guidelines|empfehlung|recommendation)' THEN
    evidence_score := evidence_score + 0.3;
  END IF;
  
  IF knowledge_record.content ~* '(klinisch|clinical|therapie|treatment)' THEN
    evidence_score := evidence_score + 0.2;
  END IF;
  
  IF knowledge_record.content ~* '(evidenz|evidence|wissenschaftlich|scientific)' THEN
    evidence_score := evidence_score + 0.1;
  END IF;
  
  -- Recency assessment (check for current years)
  IF knowledge_record.content ~* '(2024|2025)' THEN
    recency_score := 1.0;
  ELSIF knowledge_record.content ~* '(2022|2023)' THEN
    recency_score := 0.8;
  ELSIF knowledge_record.content ~* '(2020|2021)' THEN
    recency_score := 0.6;
  ELSE
    recency_score := 0.3;
  END IF;
  
  -- Female health specialization assessment
  WITH specialization_terms AS (
    SELECT unnest(ARRAY[
      'zyklus', 'menstruation', 'östrogen', 'progesteron', 'menopause',
      'pcos', 'endometriose', 'schwangerschaft', 'weiblich', 'frau'
    ]) AS term
  )
  SELECT COUNT(*)::numeric / 10.0 INTO specialization_score
  FROM specialization_terms st
  WHERE knowledge_record.content ILIKE '%' || st.term || '%';
  
  -- Count potential citations
  SELECT array_length(string_to_array(knowledge_record.content, 'et al.'), 1) - 1 INTO citation_count;
  citation_count := GREATEST(citation_count, 0);
  
  -- Build quality metrics
  quality_metrics := jsonb_build_object(
    'overall_quality_score', (evidence_score + recency_score + specialization_score) / 3,
    'evidence_quality_score', evidence_score,
    'recency_score', recency_score,
    'vita_specialization_score', specialization_score,
    'estimated_citation_count', citation_count,
    'content_length', length(knowledge_record.content),
    'assessment_timestamp', now(),
    'quality_grade', 
      CASE 
        WHEN (evidence_score + recency_score + specialization_score) / 3 > 0.8 THEN 'A'
        WHEN (evidence_score + recency_score + specialization_score) / 3 > 0.6 THEN 'B'
        WHEN (evidence_score + recency_score + specialization_score) / 3 > 0.4 THEN 'C'
        ELSE 'D'
      END
  );
  
  RETURN quality_metrics;
END;
$$;

-- 4. Create Performance Indexes for Vita-Specific Searches
CREATE INDEX IF NOT EXISTS idx_knowledge_base_vita_content_gin 
ON public.coach_knowledge_base USING gin(to_tsvector('german', content))
WHERE coach_id = 'vita';

CREATE INDEX IF NOT EXISTS idx_knowledge_base_vita_title_gin 
ON public.coach_knowledge_base USING gin(to_tsvector('german', title))
WHERE coach_id = 'vita';

-- Index for female health specific terms
CREATE INDEX IF NOT EXISTS idx_knowledge_base_vita_female_terms 
ON public.coach_knowledge_base (id)
WHERE coach_id = 'vita' 
AND (
  content ILIKE '%zyklus%' OR 
  content ILIKE '%menstruation%' OR 
  content ILIKE '%hormon%' OR 
  content ILIKE '%menopause%' OR
  content ILIKE '%östrogen%' OR
  content ILIKE '%progesteron%'
);

-- 5. Vita Knowledge Base Analytics View
CREATE OR REPLACE VIEW public.v_vita_knowledge_analytics AS
SELECT 
  kb.id,
  kb.title,
  kb.expertise_area,
  kb.created_at,
  kb.updated_at,
  length(kb.content) as content_length,
  
  -- Female health topic coverage
  CASE 
    WHEN kb.content ~* '(zyklus|menstruation|periode)' THEN TRUE 
    ELSE FALSE 
  END as covers_menstrual_health,
  
  CASE 
    WHEN kb.content ~* '(menopause|wechseljahre|östrogenmangel)' THEN TRUE 
    ELSE FALSE 
  END as covers_menopause,
  
  CASE 
    WHEN kb.content ~* '(pcos|insulinresistenz|hyperandrogenismus)' THEN TRUE 
    ELSE FALSE 
  END as covers_pcos,
  
  CASE 
    WHEN kb.content ~* '(endometriose|schmerzen|chronisch)' THEN TRUE 
    ELSE FALSE 
  END as covers_endometriosis,
  
  CASE 
    WHEN kb.content ~* '(schwangerschaft|prenatal|beckenboden)' THEN TRUE 
    ELSE FALSE 
  END as covers_pregnancy,
  
  -- Evidence quality indicators
  CASE 
    WHEN kb.content ~* '(studie|research|systematic|meta-analysis)' THEN 'high'
    WHEN kb.content ~* '(leitlinien|guidelines|empfehlung)' THEN 'medium'
    ELSE 'practical'
  END as evidence_level,
  
  -- Embedding status
  CASE 
    WHEN EXISTS (SELECT 1 FROM knowledge_base_embeddings kbe WHERE kbe.knowledge_id = kb.id) 
    THEN TRUE 
    ELSE FALSE 
  END as has_embeddings,
  
  -- Usage metrics (would need tracking)
  0 as search_hits_last_30_days -- Placeholder for future analytics
  
FROM coach_knowledge_base kb
WHERE kb.coach_id = 'vita'
ORDER BY kb.created_at DESC;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.search_vita_knowledge_semantic TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_vita_knowledge_hybrid TO authenticated;
GRANT EXECUTE ON FUNCTION public.assess_vita_knowledge_quality TO authenticated;
GRANT SELECT ON public.v_vita_knowledge_analytics TO authenticated;