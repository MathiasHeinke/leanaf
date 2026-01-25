-- ═══════════════════════════════════════════════════════════════════════════════
-- ARES 3.0 PRO: SEMANTIC MEMORY UPGRADE
-- Adds vector embeddings to user_insights for semantic search
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to user_insights
ALTER TABLE public.user_insights 
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS last_referenced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reference_count INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.user_insights(id);

-- Create index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_user_insights_embedding 
ON public.user_insights 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_user_insights_time 
ON public.user_insights(user_id, extracted_at DESC);

-- Create index for current insights only
CREATE INDEX IF NOT EXISTS idx_user_insights_current 
ON public.user_insights(user_id, is_current) 
WHERE is_current = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Semantic search for user insights
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.search_user_insights_semantic(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_limit INT DEFAULT 10,
  p_similarity_threshold FLOAT DEFAULT 0.7
) 
RETURNS TABLE (
  id UUID,
  insight TEXT,
  category TEXT,
  subcategory TEXT,
  importance TEXT,
  similarity FLOAT,
  extracted_at TIMESTAMPTZ,
  raw_quote TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.id,
    ui.insight,
    ui.category,
    ui.subcategory,
    ui.importance,
    (1 - (ui.embedding <=> p_query_embedding))::FLOAT AS similarity,
    ui.extracted_at,
    ui.raw_quote
  FROM public.user_insights ui
  WHERE 
    ui.user_id = p_user_id
    AND ui.is_active = true
    AND ui.is_current = true
    AND ui.embedding IS NOT NULL
    AND (1 - (ui.embedding <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY ui.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Update reference count when insight is used
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_insight_reference(
  p_insight_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_insights
  SET 
    last_referenced_at = now(),
    reference_count = reference_count + 1
  WHERE id = ANY(p_insight_ids);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Mark old insight as superseded by new one
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.supersede_insight(
  p_old_insight_id UUID,
  p_new_insight_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_insights
  SET 
    is_current = false,
    superseded_by = p_new_insight_id
  WHERE id = p_old_insight_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Find duplicate/similar insights (for deduplication)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.find_similar_insights(
  p_user_id UUID,
  p_new_embedding vector(1536),
  p_category TEXT,
  p_threshold FLOAT DEFAULT 0.92
)
RETURNS TABLE (
  id UUID,
  insight TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.id,
    ui.insight,
    (1 - (ui.embedding <=> p_new_embedding))::FLOAT AS similarity
  FROM public.user_insights ui
  WHERE 
    ui.user_id = p_user_id
    AND ui.category = p_category
    AND ui.is_active = true
    AND ui.is_current = true
    AND ui.embedding IS NOT NULL
    AND (1 - (ui.embedding <=> p_new_embedding)) >= p_threshold
  ORDER BY ui.embedding <=> p_new_embedding
  LIMIT 5;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.search_user_insights_semantic TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_insight_reference TO authenticated;
GRANT EXECUTE ON FUNCTION public.supersede_insight TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_similar_insights TO authenticated;