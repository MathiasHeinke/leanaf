-- Backfill für die letzten 30 Tage
-- Erstelle temporäre Funktion für das Backfill
CREATE OR REPLACE FUNCTION backfill_daily_summaries_v2(
  p_user_id uuid,
  p_days integer DEFAULT 30
) RETURNS TABLE(
  date_processed date,
  request_id bigint,
  status text
) AS $$
DECLARE
  current_date_iter date;
  response_id bigint;
BEGIN
  -- Loop durch die letzten p_days Tage
  FOR i IN 0..p_days-1 LOOP
    current_date_iter := CURRENT_DATE - i;
    
    -- HTTP-Request an Edge Function v2
    SELECT net.http_post(
      url := 'https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/generate-day-summary-v2',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.dCHnpuqnIQLGWpL3mqAh7SPbDrIcNO77Gg7OQ5nGX2E"}'::jsonb,
      body := format('{"userId": "%s", "date": "%s", "force": true, "text": false}', p_user_id, current_date_iter)::jsonb
    ) INTO response_id;
    
    -- Return result
    date_processed := current_date_iter;
    request_id := response_id;
    status := 'requested';
    
    RETURN NEXT;
    
    -- Small delay to avoid overwhelming the Edge Function
    PERFORM pg_sleep(0.5);
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;