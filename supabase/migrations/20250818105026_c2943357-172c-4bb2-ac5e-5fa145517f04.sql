-- Secure coach_knowledge_base: enable RLS and restrict access
-- 1) Enable Row Level Security
ALTER TABLE public.coach_knowledge_base ENABLE ROW LEVEL SECURITY;

-- 2) Drop existing overly-permissive policies if any (defensive)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'coach_knowledge_base' 
      AND policyname = 'Public can view coach knowledge base'
  ) THEN
    EXECUTE 'DROP POLICY "Public can view coach knowledge base" ON public.coach_knowledge_base';
  END IF;
END$$;

-- 3) Allow SELECT to authenticated users only
CREATE POLICY "Authenticated users can view coach knowledge base"
ON public.coach_knowledge_base
FOR SELECT
TO authenticated
USING (true);

-- 4) Allow super admins to fully manage the table
CREATE POLICY "Super admins can manage coach knowledge base"
ON public.coach_knowledge_base
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());
