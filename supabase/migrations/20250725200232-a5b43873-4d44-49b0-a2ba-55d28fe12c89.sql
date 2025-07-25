-- Update cron job schedules to run every minute for faster food database import

-- Unschedule existing optimized jobs
SELECT cron.unschedule('food-database-import-optimized');
SELECT cron.unschedule('food-database-import-european');

-- Create new cron jobs that run every minute
SELECT cron.schedule(
  'food-database-import-minute',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/import-openfoodfacts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.3gKNwUXjTKo3kh1v--VGEaVgTu7_Xe5Zge2EH7HdFGQ"}'::jsonb,
        body:=('{"action": "import", "limit": 50, "country": "de", "batch": ' || (EXTRACT(EPOCH FROM NOW())::int / 60 % 20 + 1) || '}')::jsonb
    ) as request_id;
  $$
);

-- Create second job for European products, alternating with German products
SELECT cron.schedule(
  'food-database-import-eu-minute', 
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/import-openfoodfacts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.3gKNwUXjTKo3kh1v--VGEaVgTu7_Xe5Zge2EH7HdFGQ"}'::jsonb,
        body:=('{"action": "import", "limit": 30, "country": "eu", "batch": ' || (EXTRACT(EPOCH FROM NOW())::int / 60 % 15 + 1) || '}')::jsonb
    ) as request_id;
  $$
);