-- Remove OpenFoodFacts integration: unschedule cron jobs and clean imported data

-- 1) Unschedule any pg_cron jobs that invoke the import-openfoodfacts Edge Function
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
      -- Try unschedule by name (newer pg_cron)
      PERFORM cron.unschedule(r.jobname);
    EXCEPTION WHEN OTHERS THEN
      -- Fallback: unschedule by id (older pg_cron)
      PERFORM cron.unschedule(r.jobid);
    END;
  END LOOP;
  -- Safety cleanup
  DELETE FROM cron.job WHERE command ILIKE '%functions/v1/import-openfoodfacts%';
END $$;

-- 2) Null-out references in user_food_corrections to allow safe deletions
UPDATE public.user_food_corrections 
SET suggested_food_id = NULL, corrected_food_id = NULL
WHERE suggested_food_id IS NOT NULL OR corrected_food_id IS NOT NULL;

-- 3) Delete all imported OpenFoodFacts rows from food_database (will cascade)
DELETE FROM public.food_database 
WHERE source = 'openfoodfacts';

-- 4) Optional safety cleanup for any potential orphan records (should be none due to ON DELETE CASCADE)
DELETE FROM public.brand_products bp 
USING public.food_database fd 
WHERE bp.food_id = fd.id AND fd.id IS NULL;

DELETE FROM public.food_aliases fa 
USING public.food_database fd 
WHERE fa.food_id = fd.id AND fd.id IS NULL;

DELETE FROM public.food_embeddings fe 
USING public.food_database fd 
WHERE fe.food_id = fd.id AND fd.id IS NULL;