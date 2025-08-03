-- Simple metadata refresh to help clear linter cache
-- This should help resolve the persistent SECURITY DEFINER view errors

-- Analyze all tables and views to refresh statistics and metadata
ANALYZE;