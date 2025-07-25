-- Update existing cron job for Food Database Import with optimized parameters
-- Increase batch size to 50 and extend interval to 5 minutes for better efficiency

-- First, unschedule the existing job
SELECT cron.unschedule('food-database-import');

-- Create optimized cron job with larger batches and longer intervals
-- Job 1: General food import with batch rotation
SELECT cron.schedule(
  'food-database-import-optimized',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/import-openfoodfacts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.3gKNwUXjTKo3kh1v--VGEaVgTu7_Xe5Zge2EH7HdFGQ"}'::jsonb,
        body:=('{"action": "import", "limit": 50, "country": "de", "batch": ' || (EXTRACT(EPOCH FROM NOW())::int / 300 % 10 + 1) || '}')::jsonb
    ) as request_id;
  $$
);

-- Create additional specialized cron job for European products
SELECT cron.schedule(
  'food-database-import-european',
  '2,12,22,32,42,52 * * * *', -- Every 10 minutes offset by 2
  $$
  SELECT
    net.http_post(
        url:='https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/import-openfoodfacts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.3gKNwUXjTKo3kh1v--VGEaVgTu7_Xe5Zge2EH7HdFGQ"}'::jsonb,
        body:=('{"action": "import", "limit": 40, "country": "eu", "batch": ' || (EXTRACT(EPOCH FROM NOW())::int / 600 % 5 + 1) || '}')::jsonb
    ) as request_id;
  $$
);