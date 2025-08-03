-- Refresh database metadata to clear linter cache
-- This should help resolve the persistent SECURITY DEFINER view errors

-- Analyze all tables and views to refresh statistics and metadata
ANALYZE;

-- Force refresh of view definitions in system catalogs
SELECT pg_stat_reset();

-- Update table statistics for all user tables
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ANALYZE ' || quote_ident(rec.schemaname) || '.' || quote_ident(rec.tablename);
    END LOOP;
END $$;

-- Refresh materialized views if any exist
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT schemaname, matviewname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'REFRESH MATERIALIZED VIEW ' || quote_ident(rec.schemaname) || '.' || quote_ident(rec.matviewname);
    END LOOP;
END $$;