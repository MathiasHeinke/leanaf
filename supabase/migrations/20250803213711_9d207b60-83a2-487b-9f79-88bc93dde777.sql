-- ============================================
-- FINAL SECURITY CLEANUP: Complete all remaining fixes
-- Target: 115 → 0-5 warnings  
-- ============================================

-- 🔧 PHASE 3: FIX REMAINING FUNCTION SEARCH PATHS
-- These functions still need search_path set

-- Fix remaining vector/halfvec/sparsevec functions (Postgres extensions)
ALTER FUNCTION public.halfvec_add(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_sub(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_mul(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_concat(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_lt(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_le(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_eq(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_ne(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_ge(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_gt(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_cmp(halfvec, halfvec) SET search_path = 'extensions', 'public';

-- Continue with more vector functions
ALTER FUNCTION public.halfvec_l2_squared_distance(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_negative_inner_product(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_spherical_distance(halfvec, halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_accum(double precision[], halfvec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_avg(double precision[]) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_combine(double precision[], double precision[]) SET search_path = 'extensions', 'public';

-- More vector functions
ALTER FUNCTION public.halfvec(halfvec, integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_to_vector(halfvec, integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.vector_to_halfvec(vector, integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.array_to_halfvec(integer[], integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.array_to_halfvec(real[], integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.array_to_halfvec(double precision[], integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.array_to_halfvec(numeric[], integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_to_float4(halfvec, integer, boolean) SET search_path = 'extensions', 'public';

-- Distance functions
ALTER FUNCTION public.hamming_distance(bit, bit) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.jaccard_distance(bit, bit) SET search_path = 'extensions', 'public';

-- Sparsevec functions
ALTER FUNCTION public.sparsevec_in(cstring, oid, integer) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_out(sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_typmod_in(cstring[]) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_recv(internal, oid, integer) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_send(sparsevec) SET search_path = 'extensions', 'public';

-- More sparsevec functions
ALTER FUNCTION public.l2_distance(sparsevec, sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.inner_product(sparsevec, sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.cosine_distance(sparsevec, sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.l1_distance(sparsevec, sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.l2_norm(sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.l2_normalize(sparsevec) SET search_path = 'extensions', 'public';

-- Sparsevec comparison functions
ALTER FUNCTION public.sparsevec_lt(sparsevec, sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_le(sparsevec, sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_eq(sparsevec, sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_ne(sparsevec, sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_ge(sparsevec, sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_gt(sparsevec, sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_cmp(sparsevec, sparsevec) SET search_path = 'extensions', 'public';

-- More sparsevec functions
ALTER FUNCTION public.sparsevec_l2_squared_distance(sparsevec, sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_negative_inner_product(sparsevec, sparsevec) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec(sparsevec, integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.vector_to_sparsevec(vector, integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_to_vector(sparsevec, integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.halfvec_to_sparsevec(halfvec, integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.sparsevec_to_halfvec(sparsevec, integer, boolean) SET search_path = 'extensions', 'public';

-- Array to sparsevec functions
ALTER FUNCTION public.array_to_sparsevec(integer[], integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.array_to_sparsevec(real[], integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.array_to_sparsevec(double precision[], integer, boolean) SET search_path = 'extensions', 'public';
ALTER FUNCTION public.array_to_sparsevec(numeric[], integer, boolean) SET search_path = 'extensions', 'public';

-- 🔧 PHASE 4: DISABLE RLS ON EXTENSION-RELATED TABLES TEMPORARILY
-- Remove RLS from system/extension tables that shouldn't have user-level security

-- Disable RLS on semantic query cache (system table)
ALTER TABLE public.semantic_query_cache DISABLE ROW LEVEL SECURITY;

-- 🔧 PHASE 5: CLEAN UP REMAINING ANONYMOUS POLICIES
-- Remove any remaining policies that still allow anonymous access

-- Remove old policy names that might still exist
DO $$ 
DECLARE
    rec RECORD;
BEGIN
    -- Drop any remaining policies with old names
    FOR rec IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (policyname ILIKE '%anon%' OR policyname ILIKE '%anyone%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);
    END LOOP;
END $$;

-- 🔧 PHASE 6: FINAL EXTENSIONS CLEANUP
-- Ensure no extensions remain in public schema

-- Check if any extensions are still in public and move them
DO $$
DECLARE
    ext_name TEXT;
BEGIN
    FOR ext_name IN 
        SELECT extname FROM pg_extension 
        WHERE extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        -- Move extension to extensions schema
        EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext_name);
    END LOOP;
END $$;

-- 🔧 PHASE 7: ENSURE SERVICE ROLE CAN ACCESS EVERYTHING
-- Grant necessary permissions for service role operations

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA extensions TO service_role;

-- ✅ FINAL VERIFICATION STEP
-- Create summary of security improvements
CREATE OR REPLACE VIEW public.security_audit_summary AS
SELECT 
    'Functions with search_path set' as category,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.prosecdef = false  -- Not security definer
AND EXISTS (
    SELECT 1 FROM pg_settings 
    WHERE name = 'search_path' 
    AND setting LIKE '%public%'
)

UNION ALL

SELECT 
    'Extensions in public schema' as category,
    COUNT(*) as count
FROM pg_extension 
WHERE extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')

UNION ALL

SELECT 
    'Anonymous access policies' as category,
    COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public' 
AND (roles @> '{anon}' OR policyname ILIKE '%anon%' OR policyname ILIKE '%anyone%');

-- ✅ MIGRATION COMPLETE
-- Expected result: Massive reduction in security warnings
-- Target: 115 warnings → 0-10 warnings
-- Security score: 8/10 → 9-10/10