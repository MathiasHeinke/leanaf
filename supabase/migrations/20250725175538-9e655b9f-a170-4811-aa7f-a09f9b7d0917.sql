-- Create a new cron job to import German food products every 2 minutes (10 products per batch)
SELECT cron.schedule(
  'import-german-food-products-micro',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/import-openfoodfacts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I"}'::jsonb,
        body:='{"action": "import", "limit": 10, "country": "de", "batch": 1}'::jsonb
    ) as request_id;
  $$
);