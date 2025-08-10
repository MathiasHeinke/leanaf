-- Fix view creation error: remove ORDER BY inside DISTINCT array_agg
CREATE OR REPLACE VIEW public.v_orchestrator_traces_open_errors AS
SELECT
  t.trace_id,
  MIN(t.timestamp) AS started_at,
  MAX(t.timestamp) AS last_event_at,
  t.user_id,
  t.coach_id,
  ARRAY_AGG(DISTINCT t.stage) AS stages_run,
  BOOL_OR(t.status = 'ERROR')   AS has_error,
  BOOL_OR(t.status = 'RUNNING') AS still_running,
  CASE
    WHEN BOOL_OR(t.status = 'ERROR') THEN 'ERROR'
    WHEN BOOL_OR(t.status = 'RUNNING') THEN 'RUNNING'
    ELSE 'OK'
  END AS aggregated_status,
  MAX(t.latency_ms) AS max_latency_ms,
  JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'stage', t.stage,
      'status', t.status,
      'latency_ms', t.latency_ms,
      'timestamp', t.timestamp,
      'handler', t.handler_name
    ) ORDER BY t.timestamp
  ) AS stage_details
FROM public.orchestrator_traces t
WHERE t.timestamp >= now() - INTERVAL '24 hours'
GROUP BY t.trace_id, t.user_id, t.coach_id
HAVING BOOL_OR(t.status = 'ERROR') OR BOOL_OR(t.status = 'RUNNING');