-- Start embedding generation for all 354 knowledge entries
-- This will trigger the batch-embeddings-job edge function
SELECT net.http_post(
  url := 'https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/batch-embeddings-job',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.dCHnpuqnIQLGWpL3mqAh7SPbDrIcNO77Gg7OQ5nGX2E"}'::jsonb,
  body := '{"regenerate_all": true}'::jsonb
) as request_id;