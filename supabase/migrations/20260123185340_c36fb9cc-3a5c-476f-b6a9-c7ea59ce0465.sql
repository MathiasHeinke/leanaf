-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1 TASK 1: Knowledge Taxonomy für ARES
-- Wissenschaftliche Topics mit Evidenz-Levels für dynamisches RAG
-- ═══════════════════════════════════════════════════════════════════════════════

-- Tabelle für Knowledge Taxonomy
CREATE TABLE IF NOT EXISTS public.knowledge_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hierarchie: Level 1 > Level 2 > Level 3
  category_level1 TEXT NOT NULL,
  category_level2 TEXT,
  category_level3 TEXT,
  
  -- Vollständiger Pfad für einfaches Querying
  category_path TEXT GENERATED ALWAYS AS (
    COALESCE(category_level1, '') || 
    CASE WHEN category_level2 IS NOT NULL THEN ' > ' || category_level2 ELSE '' END ||
    CASE WHEN category_level3 IS NOT NULL THEN ' > ' || category_level3 ELSE '' END
  ) STORED,
  
  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  summary TEXT,
  
  -- Evidenz-Level: stark (RCTs, Meta-Analysen), moderat (Studien), anekdotisch (Erfahrung)
  evidence_level TEXT NOT NULL CHECK (evidence_level IN ('stark', 'moderat', 'anekdotisch')),
  
  -- Quellen als JSONB Array: [{doi: "...", title: "...", year: 2024}]
  sources JSONB DEFAULT '[]'::jsonb,
  
  -- Relevante User-Tabellen für Kontext (z.B. ['workouts', 'daily_goals'])
  relevant_user_tables TEXT[] DEFAULT '{}',
  
  -- Relevante Blutmarker (z.B. ['testosterone', 'igf1', 'hba1c'])
  relevant_bloodwork_markers TEXT[] DEFAULT '{}',
  
  -- Keywords für Matching (z.B. ['semaglutide', 'ozempic', 'glp-1', 'abnehmen'])
  keywords TEXT[] DEFAULT '{}',
  
  -- Synonyme für besseres Matching (z.B. ['Wegovy', 'Mounjaro'])
  synonyms TEXT[] DEFAULT '{}',
  
  -- Flags
  is_sensitive BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES für Performance
-- ═══════════════════════════════════════════════════════════════════════════════

-- GIN Index für Keywords-Array-Suche
CREATE INDEX IF NOT EXISTS idx_knowledge_taxonomy_keywords 
ON public.knowledge_taxonomy USING GIN (keywords);

-- GIN Index für Synonyme-Array-Suche
CREATE INDEX IF NOT EXISTS idx_knowledge_taxonomy_synonyms 
ON public.knowledge_taxonomy USING GIN (synonyms);

-- GIN Index für Blutmarker-Array-Suche
CREATE INDEX IF NOT EXISTS idx_knowledge_taxonomy_bloodwork_markers 
ON public.knowledge_taxonomy USING GIN (relevant_bloodwork_markers);

-- Fulltext-Suche auf Title + Description
CREATE INDEX IF NOT EXISTS idx_knowledge_taxonomy_fulltext 
ON public.knowledge_taxonomy USING GIN (
  to_tsvector('german', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(summary, ''))
);

-- Index für Kategorie-Hierarchie
CREATE INDEX IF NOT EXISTS idx_knowledge_taxonomy_categories 
ON public.knowledge_taxonomy (category_level1, category_level2, category_level3);

-- Index für Evidenz-Level Filterung
CREATE INDEX IF NOT EXISTS idx_knowledge_taxonomy_evidence 
ON public.knowledge_taxonomy (evidence_level) WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.knowledge_taxonomy ENABLE ROW LEVEL SECURITY;

-- Öffentlicher Lesezugriff für aktive Topics
CREATE POLICY "Anyone can view active knowledge topics"
ON public.knowledge_taxonomy
FOR SELECT
USING (is_active = true);

-- Super Admins können alles
CREATE POLICY "Super admins can manage knowledge taxonomy"
ON public.knowledge_taxonomy
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Service Role kann alles (für Import-Scripts)
CREATE POLICY "Service role can manage knowledge taxonomy"
ON public.knowledge_taxonomy
FOR ALL
USING (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role')
WITH CHECK (((current_setting('request.jwt.claims'::text, true))::jsonb ->> 'role'::text) = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGER für updated_at
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_knowledge_taxonomy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_knowledge_taxonomy_updated_at
BEFORE UPDATE ON public.knowledge_taxonomy
FOR EACH ROW
EXECUTE FUNCTION public.update_knowledge_taxonomy_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- HILFSFUNKTION: Keyword-basierte Topic-Suche
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.search_knowledge_topics(
  search_terms TEXT[],
  max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  summary TEXT,
  evidence_level TEXT,
  category_path TEXT,
  relevance_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kt.id,
    kt.title,
    kt.description,
    kt.summary,
    kt.evidence_level,
    kt.category_path,
    (
      -- Score basierend auf Matches
      CASE WHEN kt.keywords && search_terms THEN 10 ELSE 0 END +
      CASE WHEN kt.synonyms && search_terms THEN 8 ELSE 0 END +
      CASE WHEN kt.evidence_level = 'stark' THEN 5 
           WHEN kt.evidence_level = 'moderat' THEN 3 
           ELSE 1 END
    )::INTEGER as relevance_score
  FROM public.knowledge_taxonomy kt
  WHERE 
    kt.is_active = true
    AND (
      kt.keywords && search_terms
      OR kt.synonyms && search_terms
      OR to_tsvector('german', kt.title || ' ' || kt.description) @@ plainto_tsquery('german', array_to_string(search_terms, ' '))
    )
  ORDER BY relevance_score DESC, kt.evidence_level ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.search_knowledge_topics TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_knowledge_topics TO service_role;