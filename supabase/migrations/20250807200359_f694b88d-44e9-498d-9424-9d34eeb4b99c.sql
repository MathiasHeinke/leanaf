-- Fix: Only unschedule via cron.unschedule; avoid direct DELETE on cron.job (permission issue)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT jobid, COALESCE(jobname, 'job_' || jobid::text) AS jobname
    FROM cron.job
    WHERE command ILIKE '%functions/v1/import-openfoodfacts%'
  LOOP
    BEGIN
      PERFORM cron.unschedule(r.jobname);
    EXCEPTION WHEN OTHERS THEN
      PERFORM cron.unschedule(r.jobid);
    END;
  END LOOP;
END $$;

-- Null-out references in user_food_corrections to allow safe deletions
UPDATE public.user_food_corrections 
SET suggested_food_id = NULL, corrected_food_id = NULL
WHERE suggested_food_id IS NOT NULL OR corrected_food_id IS NOT NULL;

-- Delete all imported OpenFoodFacts rows from food_database (will cascade)
DELETE FROM public.food_database 
WHERE source = 'openfoodfacts';