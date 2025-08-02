-- Test der Edge Function mit korrekten Parametern
SELECT net.http_post(
  url := 'https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/generate-day-summary-v2',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.dCHnpuqnIQLGWpL3mqAh7SPbDrIcNO77Gg7OQ5nGX2E"}'::jsonb,
  body := '{"userId": "84b0664f-0934-49ce-9c35-c99546b792bf", "date": "2025-08-01", "force": true, "text": false}'::jsonb
) as request_id;