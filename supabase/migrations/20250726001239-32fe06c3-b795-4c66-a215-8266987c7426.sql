-- Cron Job Tracking Table für verschiedene Import-Strategien
CREATE TABLE public.cron_job_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  strategy TEXT NOT NULL,
  batch_size INTEGER NOT NULL DEFAULT 0,
  products_imported INTEGER NOT NULL DEFAULT 0,
  products_skipped INTEGER NOT NULL DEFAULT 0,
  products_failed INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  error_message TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  job_params JSONB DEFAULT '{}'::jsonb
);

-- Index für bessere Performance bei Abfragen
CREATE INDEX idx_cron_job_stats_job_name ON public.cron_job_stats(job_name);
CREATE INDEX idx_cron_job_stats_created_at ON public.cron_job_stats(created_at);
CREATE INDEX idx_cron_job_stats_success ON public.cron_job_stats(success);

-- RLS Policies
ALTER TABLE public.cron_job_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cron job stats" 
ON public.cron_job_stats 
FOR SELECT 
USING (is_admin_by_email());

CREATE POLICY "System can insert cron job stats" 
ON public.cron_job_stats 
FOR INSERT 
WITH CHECK (true);

-- Erstelle 3 verschiedene Cron Jobs mit unterschiedlichen Strategien
-- Job 1: Große Batches mit Global Popular (alle 2 Minuten)
select
cron.schedule(
  'import-openfood-global-large',
  '*/2 * * * *', -- alle 2 Minuten
  $$
  select
    net.http_post(
        url:='https://qbhawatocqnxfyixvkjag.supabase.co/functions/v1/import-openfoodfacts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaGF3YXRvY3FueGZ5aXh2a2phZyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0NDU3MTkwLCJleHAiOjIwNTAwMzMxOTB9.vTIlYJ-g2zV0sHpA6qvZTh0ykDbQPxRoXNq8HIKLFmI"}'::jsonb,
        body:=jsonb_build_object(
          'action', 'import',
          'limit', 50,
          'country', 'de',
          'batch', extract(epoch from now())::integer % 1000,
          'job_name', 'global-large',
          'strategy', 'global_popular'
        )
    ) as request_id;
  $$
);

-- Job 2: Mittlere Batches mit German Focus (alle 3 Minuten)
select
cron.schedule(
  'import-openfood-german-medium',
  '*/3 * * * *', -- alle 3 Minuten
  $$
  select
    net.http_post(
        url:='https://qbhawatocqnxfyixvkjag.supabase.co/functions/v1/import-openfoodfacts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaGF3YXRvY3FueGZ5aXh2a2phZyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0NDU3MTkwLCJleHAiOjIwNTAwMzMxOTB9.vTIlYJ-g2zV0sHpA6qvZTh0ykDbQPxRoXNq8HIKLFmI"}'::jsonb,
        body:=jsonb_build_object(
          'action', 'import',
          'limit', 30,
          'country', 'de',
          'batch', extract(epoch from now())::integer % 500,
          'job_name', 'german-medium',
          'strategy', 'german_focused'
        )
    ) as request_id;
  $$
);

-- Job 3: Kleine Batches mit European Focus (alle 4 Minuten)
select
cron.schedule(
  'import-openfood-european-small',
  '*/4 * * * *', -- alle 4 Minuten
  $$
  select
    net.http_post(
        url:='https://qbhawatocqnxfyixvkjag.supabase.co/functions/v1/import-openfoodfacts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaGF3YXRvY3FueGZ5aXh2a2phZyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0NDU3MTkwLCJleHAiOjIwNTAwMzMxOTB9.vTIlYJ-g2zV0sHpA6qvZTh0ykDbQPxRoXNq8HIKLFmI"}'::jsonb,
        body:=jsonb_build_object(
          'action', 'import',
          'limit', 20,
          'country', 'de',
          'batch', extract(epoch from now())::integer % 300,
          'job_name', 'european-small',
          'strategy', 'european_focused'
        )
    ) as request_id;
  $$
);