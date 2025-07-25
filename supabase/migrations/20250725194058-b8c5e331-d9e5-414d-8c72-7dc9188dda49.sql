-- Enable required extensions for cron jobs and HTTP requests
-- This will allow the Food Database Import cron job to function properly

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests from within the database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions to the service role
GRANT USAGE ON SCHEMA cron TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO service_role;

-- Grant permissions for pg_net
GRANT USAGE ON SCHEMA net TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO service_role;

-- Verify that the Food Database Import cron job exists and recreate if needed
-- This job runs every 2 minutes to import food data from OpenFoodFacts
SELECT cron.schedule(
  'food-database-import',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/import-openfoodfacts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.3gKNwUXjTKo3kh1v--VGEaVgTu7_Xe5Zge2EH7HdFGQ"}'::jsonb,
        body:='{"action": "import", "limit": 10, "country": "de", "batch": 1}'::jsonb
    ) as request_id;
  $$
);