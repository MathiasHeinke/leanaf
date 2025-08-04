-- Phase 1: Fix RAG System - Regenerate missing embeddings
-- Call the batch embeddings function to fill missing 206 embeddings
SELECT * FROM net.http_post(
  'https://gzczjscctgyxjyodhnhk.supabase.co/functions/v1/batch-generate-embeddings',
  '{"regenerate_missing": true}'::jsonb,
  '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Y3pqc2NjdGd5eGp5b2RobmhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjc0Nzk4MiwiZXhwIjoyMDY4MzIzOTgyfQ.dCHnpuqnIQLGWpL3mqAh7SPbDrIcNO77Gg7OQ5nGX2E"}'::jsonb
);