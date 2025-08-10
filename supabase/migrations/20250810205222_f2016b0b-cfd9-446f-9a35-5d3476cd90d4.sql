-- Fix views and indexes to use existing column name "timestamp"

-- Ensure Realtime remains enabled
ALTER TABLE public.orchestrator_traces REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='orchestrator_traces'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orchestrator_traces;
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_orch_traces_timestamp ON public.orchestrator_traces("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_orch_traces_stage ON public.orchestrator_traces(stage);
CREATE INDEX IF NOT EXISTS idx_orch_traces_status ON public.orchestrator_traces(status);
CREATE INDEX IF NOT EXISTS idx_orch_traces_user_id ON public.orchestrator_traces(user_id);
CREATE INDEX IF NOT EXISTS idx_orch_traces_coach_id ON public.orchestrator_traces(coach_id);

-- Views using "timestamp"
CREATE OR REPLACE VIEW public.v_orchestrator_traces_recent AS
  SELECT *
  FROM public.orchestrator_traces
  WHERE "timestamp" >= now() - interval '60 minutes';

CREATE OR REPLACE VIEW public.v_orchestrator_traces_open_errors AS
WITH latest AS (
  SELECT DISTINCT ON (trace_id) *
  FROM public.orchestrator_traces
  ORDER BY trace_id, "timestamp" DESC
)
SELECT *
FROM latest
WHERE status = 'ERROR' OR status = 'RUNNING';

CREATE OR REPLACE VIEW public.v_orchestrator_metrics_60m AS
SELECT
  stage,
  AVG(latency_ms)::numeric AS avg_latency_ms,
  (SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END)::double precision / NULLIF(COUNT(*),0)) AS error_rate
FROM public.orchestrator_traces
WHERE "timestamp" >= now() - interval '60 minutes'
GROUP BY stage;