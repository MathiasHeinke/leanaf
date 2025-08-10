-- Drop conflicting views to avoid column rename issues, then recreate
DROP VIEW IF EXISTS public.v_orchestrator_traces_recent;
DROP VIEW IF EXISTS public.v_orchestrator_traces_open_errors;
DROP VIEW IF EXISTS public.v_orchestrator_metrics_60m;

CREATE VIEW public.v_orchestrator_traces_recent AS
  SELECT *
  FROM public.orchestrator_traces
  WHERE "timestamp" >= now() - interval '60 minutes';

CREATE VIEW public.v_orchestrator_traces_open_errors AS
WITH latest AS (
  SELECT DISTINCT ON (trace_id) *
  FROM public.orchestrator_traces
  ORDER BY trace_id, "timestamp" DESC
)
SELECT *
FROM latest
WHERE status = 'ERROR' OR status = 'RUNNING';

CREATE VIEW public.v_orchestrator_metrics_60m AS
SELECT
  stage,
  AVG(latency_ms)::numeric AS avg_latency_ms,
  (SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END)::double precision / NULLIF(COUNT(*),0)) AS error_rate
FROM public.orchestrator_traces
WHERE "timestamp" >= now() - interval '60 minutes'
GROUP BY stage;