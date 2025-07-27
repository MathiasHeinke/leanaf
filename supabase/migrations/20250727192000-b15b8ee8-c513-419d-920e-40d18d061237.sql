-- Phase 1: Real Vector Semantics für Sascha's RAG System
-- Knowledge Base Embeddings Tabelle
CREATE TABLE public.knowledge_base_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_id UUID NOT NULL REFERENCES public.coach_knowledge_base(id) ON DELETE CASCADE,
  content_chunk TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Query Cache Tabelle für Performance-Optimierung
CREATE TABLE public.semantic_query_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_text TEXT NOT NULL,
  query_embedding vector(1536),
  cached_results JSONB NOT NULL DEFAULT '[]',
  hit_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance-Tracking Tabelle
CREATE TABLE public.rag_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  coach_id TEXT NOT NULL,
  query_text TEXT NOT NULL,
  search_method TEXT NOT NULL, -- 'semantic', 'keyword', 'hybrid'
  response_time_ms INTEGER NOT NULL,
  relevance_score NUMERIC(3,2),
  user_rating INTEGER, -- 1-5 rating from user
  cache_hit BOOLEAN DEFAULT false,
  embedding_tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indizes für Performance
CREATE INDEX idx_knowledge_embeddings_knowledge_id ON public.knowledge_base_embeddings(knowledge_id);
CREATE INDEX idx_knowledge_embeddings_embedding ON public.knowledge_base_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_query_cache_text ON public.semantic_query_cache(query_text);
CREATE INDEX idx_query_cache_embedding ON public.semantic_query_cache USING hnsw (query_embedding vector_cosine_ops);
CREATE INDEX idx_rag_metrics_coach_created ON public.rag_performance_metrics(coach_id, created_at);

-- RLS Policies für Knowledge Base Embeddings
ALTER TABLE public.knowledge_base_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view knowledge embeddings" 
ON public.knowledge_base_embeddings 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage knowledge embeddings" 
ON public.knowledge_base_embeddings 
FOR ALL 
USING (is_super_admin());

-- RLS Policies für Query Cache
ALTER TABLE public.semantic_query_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage query cache" 
ON public.semantic_query_cache 
FOR ALL 
USING (true);

-- RLS Policies für Performance Metrics
ALTER TABLE public.rag_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics" 
ON public.rag_performance_metrics 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can insert metrics" 
ON public.rag_performance_metrics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Super admins can view all metrics" 
ON public.rag_performance_metrics 
FOR SELECT 
USING (is_super_admin());

-- Semantic Search Funktion
CREATE OR REPLACE FUNCTION public.search_knowledge_semantic(
  query_embedding vector(1536),
  coach_filter text DEFAULT NULL,
  similarity_threshold numeric DEFAULT 0.7,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  knowledge_id uuid,
  content_chunk text,
  similarity numeric,
  title text,
  expertise_area text,
  coach_id text,
  chunk_index integer
) 
LANGUAGE sql 
STABLE
AS $$
  SELECT 
    ke.knowledge_id,
    ke.content_chunk,
    1 - (ke.embedding <=> query_embedding) AS similarity,
    kb.title,
    kb.expertise_area,
    kb.coach_id,
    ke.chunk_index
  FROM public.knowledge_base_embeddings ke
  JOIN public.coach_knowledge_base kb ON ke.knowledge_id = kb.id
  WHERE 
    1 - (ke.embedding <=> query_embedding) > similarity_threshold
    AND (coach_filter IS NULL OR kb.coach_id = coach_filter)
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Hybrid Search Funktion (Semantic + Text)
CREATE OR REPLACE FUNCTION public.search_knowledge_hybrid(
  query_text text,
  query_embedding vector(1536),
  coach_filter text DEFAULT NULL,
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
  coach_id text
) 
LANGUAGE sql 
STABLE
AS $$
  WITH semantic_results AS (
    SELECT 
      ke.knowledge_id,
      ke.content_chunk,
      1 - (ke.embedding <=> query_embedding) AS semantic_score,
      kb.title,
      kb.expertise_area,
      kb.coach_id
    FROM public.knowledge_base_embeddings ke
    JOIN public.coach_knowledge_base kb ON ke.knowledge_id = kb.id
    WHERE coach_filter IS NULL OR kb.coach_id = coach_filter
  ),
  text_results AS (
    SELECT 
      kb.id as knowledge_id,
      ke.content_chunk,
      ts_rank_cd(
        to_tsvector('german', ke.content_chunk),
        plainto_tsquery('german', query_text)
      ) AS text_score,
      kb.title,
      kb.expertise_area,
      kb.coach_id
    FROM public.coach_knowledge_base kb
    JOIN public.knowledge_base_embeddings ke ON kb.id = ke.knowledge_id
    WHERE 
      to_tsvector('german', ke.content_chunk) @@ plainto_tsquery('german', query_text)
      AND (coach_filter IS NULL OR kb.coach_id = coach_filter)
  )
  SELECT 
    COALESCE(s.knowledge_id, t.knowledge_id) as knowledge_id,
    COALESCE(s.content_chunk, t.content_chunk) as content_chunk,
    (COALESCE(s.semantic_score, 0) * semantic_weight + COALESCE(t.text_score, 0) * text_weight) as combined_score,
    COALESCE(s.semantic_score, 0) as semantic_score,
    COALESCE(t.text_score, 0) as text_score,
    COALESCE(s.title, t.title) as title,
    COALESCE(s.expertise_area, t.expertise_area) as expertise_area,
    COALESCE(s.coach_id, t.coach_id) as coach_id
  FROM semantic_results s
  FULL OUTER JOIN text_results t ON s.knowledge_id = t.knowledge_id AND s.content_chunk = t.content_chunk
  WHERE 
    (s.semantic_score > 0.5 OR t.text_score > 0.1)
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;

-- Trigger für automatische Timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_embeddings_updated_at
  BEFORE UPDATE ON public.knowledge_base_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Query Cache Management Funktion
CREATE OR REPLACE FUNCTION public.get_or_cache_query_embedding(
  query_text text,
  query_embedding vector(1536)
)
RETURNS vector(1536)
LANGUAGE plpgsql
AS $$
DECLARE
  cached_embedding vector(1536);
BEGIN
  -- Prüfe Cache
  SELECT query_embedding INTO cached_embedding
  FROM public.semantic_query_cache
  WHERE query_text = $1;
  
  IF cached_embedding IS NOT NULL THEN
    -- Update hit count und last_used
    UPDATE public.semantic_query_cache
    SET hit_count = hit_count + 1, last_used_at = now()
    WHERE query_text = $1;
    
    RETURN cached_embedding;
  ELSE
    -- Cache new query
    INSERT INTO public.semantic_query_cache (query_text, query_embedding)
    VALUES ($1, $2)
    ON CONFLICT (query_text) DO UPDATE SET
      hit_count = semantic_query_cache.hit_count + 1,
      last_used_at = now();
    
    RETURN $2;
  END IF;
END;
$$;