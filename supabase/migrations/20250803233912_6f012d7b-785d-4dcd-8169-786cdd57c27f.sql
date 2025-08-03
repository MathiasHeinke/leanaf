-- Add missing metadata column to knowledge_base_embeddings table
ALTER TABLE public.knowledge_base_embeddings 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embeddings_metadata 
ON public.knowledge_base_embeddings USING gin(metadata);