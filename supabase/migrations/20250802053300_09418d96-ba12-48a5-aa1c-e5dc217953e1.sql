-- Setup daily automatic summary generation
SELECT cron.schedule(
  'daily_summary_v2_generation',
  '5 2 * * *',  -- 02:05 AM server time (UTC) - after all daily data is complete
  $$
    SELECT net.http_post(
      url := 'https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/generate-day-summaries',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I"}'::jsonb,
      body := '{"text": false}'::jsonb
    );
  $$
);