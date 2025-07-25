-- Enable vector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create food database table for storing nutritional data from various sources
CREATE TABLE public.food_database (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_de TEXT,
  name_en TEXT,
  brand TEXT,
  barcode TEXT,
  source TEXT NOT NULL, -- 'usda', 'openfoodfacts', 'bls'
  source_id TEXT,
  category TEXT,
  
  -- Nutritional values per 100g
  calories NUMERIC,
  protein NUMERIC,
  carbs NUMERIC,
  fats NUMERIC,
  fiber NUMERIC,
  sugar NUMERIC,
  sodium NUMERIC,
  
  -- Additional nutrients
  saturated_fat NUMERIC,
  trans_fat NUMERIC,
  cholesterol NUMERIC,
  vitamin_c NUMERIC,
  calcium NUMERIC,
  iron NUMERIC,
  
  -- Meta information
  serving_size NUMERIC, -- in grams
  serving_description TEXT,
  ingredients TEXT,
  allergens TEXT[],
  
  -- Data quality
  confidence_score NUMERIC DEFAULT 1.0,
  verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create embeddings table for semantic search
CREATE TABLE public.food_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  food_id UUID NOT NULL REFERENCES public.food_database(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI ada-002 embedding size
  text_content TEXT NOT NULL, -- What was embedded (name + description)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for brand-specific products
CREATE TABLE public.brand_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  food_id UUID NOT NULL REFERENCES public.food_database(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  barcode TEXT,
  package_size NUMERIC,
  package_unit TEXT, -- 'g', 'ml', 'pieces'
  
  -- Brand-specific nutritional adjustments
  calories_adjustment NUMERIC DEFAULT 0,
  protein_adjustment NUMERIC DEFAULT 0,
  carbs_adjustment NUMERIC DEFAULT 0,
  fats_adjustment NUMERIC DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for food aliases and synonyms
CREATE TABLE public.food_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  food_id UUID NOT NULL REFERENCES public.food_database(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'de',
  alias_type TEXT NOT NULL, -- 'synonym', 'brand', 'regional', 'common'
  usage_frequency INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user food corrections and learning
CREATE TABLE public.user_food_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  food_query TEXT NOT NULL,
  suggested_food_id UUID REFERENCES public.food_database(id),
  corrected_food_id UUID REFERENCES public.food_database(id),
  correction_type TEXT NOT NULL, -- 'portion', 'food_match', 'nutrition'
  
  -- Original vs corrected values
  original_values JSONB,
  corrected_values JSONB,
  
  confidence_before NUMERIC,
  confidence_after NUMERIC DEFAULT 1.0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_food_database_name ON public.food_database USING gin(to_tsvector('german', name));
CREATE INDEX idx_food_database_name_de ON public.food_database USING gin(to_tsvector('german', name_de));
CREATE INDEX idx_food_database_brand ON public.food_database(brand);
CREATE INDEX idx_food_database_barcode ON public.food_database(barcode);
CREATE INDEX idx_food_database_source ON public.food_database(source);
CREATE INDEX idx_food_database_category ON public.food_database(category);

-- Vector similarity search index
CREATE INDEX idx_food_embeddings_vector ON public.food_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_food_aliases_alias ON public.food_aliases(alias);
CREATE INDEX idx_food_aliases_language ON public.food_aliases(language);
CREATE INDEX idx_brand_products_barcode ON public.brand_products(barcode);

-- Enable Row Level Security
ALTER TABLE public.food_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_food_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Food data is publicly readable for all users
CREATE POLICY "Anyone can view food database" 
  ON public.food_database FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can view food embeddings" 
  ON public.food_embeddings FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can view brand products" 
  ON public.brand_products FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can view food aliases" 
  ON public.food_aliases FOR SELECT 
  USING (true);

-- Only admins can modify food data
CREATE POLICY "Super admins can manage food database" 
  ON public.food_database FOR ALL 
  USING (is_super_admin());

CREATE POLICY "Super admins can manage food embeddings" 
  ON public.food_embeddings FOR ALL 
  USING (is_super_admin());

CREATE POLICY "Super admins can manage brand products" 
  ON public.brand_products FOR ALL 
  USING (is_super_admin());

CREATE POLICY "Super admins can manage food aliases" 
  ON public.food_aliases FOR ALL 
  USING (is_super_admin());

-- Users can manage their own corrections
CREATE POLICY "Users can view their own corrections" 
  ON public.user_food_corrections FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own corrections" 
  ON public.user_food_corrections FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own corrections" 
  ON public.user_food_corrections FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION public.search_similar_foods(
  query_embedding vector(1536),
  similarity_threshold NUMERIC DEFAULT 0.7,
  match_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  food_id UUID,
  name TEXT,
  brand TEXT,
  similarity NUMERIC,
  calories NUMERIC,
  protein NUMERIC,
  carbs NUMERIC,
  fats NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    fd.id,
    fd.name,
    fd.brand,
    1 - (fe.embedding <=> query_embedding) AS similarity,
    fd.calories,
    fd.protein,
    fd.carbs,
    fd.fats
  FROM public.food_embeddings fe
  JOIN public.food_database fd ON fe.food_id = fd.id
  WHERE 1 - (fe.embedding <=> query_embedding) > similarity_threshold
  ORDER BY fe.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create function for text-based food search with ranking
CREATE OR REPLACE FUNCTION public.search_foods_by_text(
  search_query TEXT,
  match_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  food_id UUID,
  name TEXT,
  brand TEXT,
  category TEXT,
  calories NUMERIC,
  protein NUMERIC,
  carbs NUMERIC,
  fats NUMERIC,
  rank REAL
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    fd.id,
    fd.name,
    fd.brand,
    fd.category,
    fd.calories,
    fd.protein,
    fd.carbs,
    fd.fats,
    ts_rank_cd(
      to_tsvector('german', COALESCE(fd.name_de, fd.name) || ' ' || COALESCE(fd.brand, '')),
      plainto_tsquery('german', search_query)
    ) AS rank
  FROM public.food_database fd
  WHERE 
    to_tsvector('german', COALESCE(fd.name_de, fd.name) || ' ' || COALESCE(fd.brand, ''))
    @@ plainto_tsquery('german', search_query)
  ORDER BY rank DESC
  LIMIT match_count;
$$;

-- Create trigger to update updated_at timestamps
CREATE TRIGGER update_food_database_updated_at
  BEFORE UPDATE ON public.food_database
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brand_products_updated_at
  BEFORE UPDATE ON public.brand_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();