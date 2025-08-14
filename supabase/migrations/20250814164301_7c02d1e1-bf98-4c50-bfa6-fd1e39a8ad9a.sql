-- Add ARES Super-RAG function for ultimate cross-domain knowledge search
CREATE OR REPLACE FUNCTION search_ares_ultimate_knowledge(
  query_text text,
  query_embedding extensions.vector,
  user_context jsonb DEFAULT '{}',
  semantic_weight numeric DEFAULT 0.8,
  text_weight numeric DEFAULT 0.2,
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
  cross_domain_boost numeric,
  ultimate_relevance numeric
)
LANGUAGE sql STABLE
SET search_path TO 'public', 'extensions'
AS $$
  WITH ares_coaching_domains AS (
    SELECT unnest(ARRAY[
      'training', 'kraft', 'muskelaufbau', 'hypertrophie', 'periodisierung',
      'ernährung', 'protein', 'makros', 'supplements', 'timing',
      'recovery', 'schlaf', 'stress', 'regeneration', 'hrv',
      'mindset', 'motivation', 'mental', 'psychology', 'toughness',
      'hormone', 'testosterone', 'östrogen', 'cortisol', 'insulin',
      'lifestyle', 'gewohnheiten', 'routine', 'optimization', 'performance'
    ]) AS domain
  ),
  enhanced_query AS (
    SELECT 
      query_text || ' ' || 
      COALESCE((user_context->>'goals')::text, '') || ' ' ||
      COALESCE((user_context->>'experience_level')::text, '') || ' ' ||
      COALESCE((user_context->>'current_focus')::text, '') AS enhanced_text
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
    -- ARES accesses ALL coaches' knowledge for ultimate synthesis
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
      to_tsvector('german', ke.content_chunk) @@ plainto_tsquery('german', eq.enhanced_text)
  ),
  cross_domain_scoring AS (
    SELECT 
      COALESCE(s.knowledge_id, t.knowledge_id) as knowledge_id,
      COALESCE(s.content_chunk, t.content_chunk) as content_chunk,
      -- ARES Cross-domain expertise scoring
      (
        SELECT COUNT(*)::numeric 
        FROM ares_coaching_domains acd 
        WHERE COALESCE(s.content_chunk, t.content_chunk) ILIKE '%' || acd.domain || '%'
      ) / 30.0 AS domain_coverage_score, -- Normalize by total domains
      
      -- Coach synthesis scoring (higher for multi-coach knowledge)
      CASE 
        WHEN COALESCE(s.coach_id, t.coach_id) = 'ares' THEN 1.0 -- ARES knowledge gets maximum boost
        WHEN COALESCE(s.coach_id, t.coach_id) IN ('lucy', 'sascha', 'kai', 'vita') THEN 0.8
        ELSE 0.6
      END AS coach_authority_score
    FROM semantic_results s
    FULL OUTER JOIN text_results t ON s.knowledge_id = t.knowledge_id AND s.content_chunk = t.content_chunk
  )
  SELECT 
    COALESCE(s.knowledge_id, t.knowledge_id) as knowledge_id,
    COALESCE(s.content_chunk, t.content_chunk) as content_chunk,
    (
      COALESCE(s.semantic_score, 0) * semantic_weight + 
      COALESCE(t.text_score, 0) * text_weight +
      cds.domain_coverage_score * 0.15 + -- Cross-domain bonus
      cds.coach_authority_score * 0.1 -- Authority bonus
    ) as combined_score,
    COALESCE(s.semantic_score, 0) as semantic_score,
    COALESCE(t.text_score, 0) as text_score,
    COALESCE(s.title, t.title) as title,
    COALESCE(s.expertise_area, t.expertise_area) as expertise_area,
    COALESCE(s.coach_id, t.coach_id) as coach_id,
    cds.domain_coverage_score as cross_domain_boost,
    (
      COALESCE(s.semantic_score, 0) * semantic_weight + 
      COALESCE(t.text_score, 0) * text_weight +
      cds.domain_coverage_score * 0.15 + 
      cds.coach_authority_score * 0.1
    ) as ultimate_relevance
  FROM semantic_results s
  FULL OUTER JOIN text_results t ON s.knowledge_id = t.knowledge_id AND s.content_chunk = t.content_chunk
  JOIN cross_domain_scoring cds ON cds.knowledge_id = COALESCE(s.knowledge_id, t.knowledge_id)
  WHERE 
    (s.semantic_score > 0.5 OR t.text_score > 0.1 OR cds.domain_coverage_score > 0.1)
  ORDER BY ultimate_relevance DESC
  LIMIT match_count;
$$;