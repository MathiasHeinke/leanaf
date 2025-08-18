-- Remove public-read policy from coach_knowledge_base and enforce authenticated-only read
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'coach_knowledge_base' 
      AND policyname = 'Anyone can view coach knowledge'
  ) THEN
    DROP POLICY "Anyone can view coach knowledge" ON public.coach_knowledge_base;
  END IF;
END$$;

-- Ensure our authenticated read policy exists (idempotent create)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'coach_knowledge_base' 
      AND policyname = 'Authenticated users can view coach knowledge base'
  ) THEN
    CREATE POLICY "Authenticated users can view coach knowledge base"
    ON public.coach_knowledge_base
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END$$;