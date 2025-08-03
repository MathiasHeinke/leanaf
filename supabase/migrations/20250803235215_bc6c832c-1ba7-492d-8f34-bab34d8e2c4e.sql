-- Test optimized embeddings function directly
SELECT net.http_post(
  url := 'https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/optimized-embeddings',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.dCHnpuqnIQLGWpL3mqAh7SPbDrIcNO77Gg7OQ5nGX2E"}'::jsonb,
  body := '{"action": "regenerate_all"}'::jsonb
) as request_id;