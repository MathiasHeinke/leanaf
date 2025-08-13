-- Remove onboarding-related database tables and functions

-- Drop onboarding_stats table
DROP TABLE IF EXISTS public.onboarding_stats CASCADE;

-- Drop onboarding_sequences table  
DROP TABLE IF EXISTS public.onboarding_sequences CASCADE;

-- Drop onboarding-related functions
DROP FUNCTION IF EXISTS public.increment_onboarding_stats() CASCADE;