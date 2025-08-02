-- Setup timezone-aware daily summary generation
-- 04:15 CEST = 02:15 UTC (summer) / 03:15 UTC (winter)
-- Using 15 2 * * * ensures it runs after local midnight in Berlin
SELECT cron.schedule(
  'daily_summary_v2_tz_aware',
  '15 2 * * *',  -- 02:15 UTC = 04:15 CEST (summer) / 03:15 CET (winter)
  $$
    SELECT net.http_post(
      url := 'https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/generate-day-summaries',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDc5ODIsImV4cCI6MjA2ODMyMzk4Mn0.RIEpNuSbszttym0v9KulYOxXX_Klose6QRAfEMuub1I"}'::jsonb,
      body := '{"text": false, "timezone": "Europe/Berlin"}'::jsonb
    );
  $$
);