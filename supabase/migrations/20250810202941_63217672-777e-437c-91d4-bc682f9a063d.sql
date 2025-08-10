-- Re-run full migration with corrected aggregates

-- Table
CREATE TABLE IF NOT EXISTS public.orchestrator_traces (
  id            BIGSERIAL PRIMARY KEY,
  trace_id      uuid NOT NULL,
  timestamp     timestamptz NOT NULL DEFAULT now(),
  user_id       uuid,
  coach_id      text,
  stage         text NOT NULL,
  handler_name  text,
  status        text NOT NULL CHECK (status IN ('OK','RUNNING','ERROR')),
  latency_ms    integer,
  payload_json  jsonb,
  error_message text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_traces_trace_id   ON public.orchestrator_traces(trace_id);
CREATE INDEX IF NOT EXISTS idx_traces_user_id    ON public.orchestrator_traces(user_id);
CREATE INDEX IF NOT EXISTS idx_traces_coach_id   ON public.orchestrator_traces(coach_id);
CREATE INDEX IF NOT EXISTS idx_traces_timestamp  ON public.orchestrator_traces(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_traces_status     ON public.orchestrator_traces(status);

-- RLS
ALTER TABLE public.orchestrator_traces ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS orchestrator_traces_admin_read ON public.orchestrator_traces;
CREATE POLICY orchestrator_traces_admin_read ON public.orchestrator_traces
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_feature_flags f
    WHERE f.user_id = auth.uid()
      AND COALESCE((f.metadata->>'gehirn_access')::boolean, false) = true
  )
  OR public.is_super_admin()
);

DROP POLICY IF EXISTS orchestrator_traces_insert ON public.orchestrator_traces;
CREATE POLICY orchestrator_traces_insert ON public.orchestrator_traces
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Views
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

CREATE OR REPLACE VIEW public.v_orchestrator_traces_recent AS
SELECT
  trace_id,
  MIN(timestamp) AS started_at,
  MAX(timestamp) AS last_event_at,
  MIN(user_id) AS user_id,
  MIN(coach_id) AS coach_id,
  CASE
    WHEN BOOL_OR(status = 'ERROR') THEN 'ERROR'
    WHEN MAX(timestamp) > now() - INTERVAL '10 seconds' AND BOOL_OR(status = 'RUNNING') THEN 'RUNNING'
    ELSE 'OK'
  END AS aggregated_status
FROM public.orchestrator_traces
WHERE timestamp >= now() - INTERVAL '72 hours'
GROUP BY trace_id
ORDER BY last_event_at DESC;

CREATE OR REPLACE VIEW public.v_orchestrator_metrics_60m AS
SELECT
  stage,
  AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL) AS avg_latency_ms,
  SUM(CASE WHEN status='ERROR' THEN 1 ELSE 0 END)::float / GREATEST(COUNT(*),1) AS error_rate
FROM public.orchestrator_traces
WHERE timestamp >= now() - INTERVAL '60 minutes'
GROUP BY stage;