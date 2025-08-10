-- P4: Orchestrator Traces table + RLS + Realtime + Views
-- 1) Table
CREATE TABLE IF NOT EXISTS public.orchestrator_traces (
  id BIGSERIAL PRIMARY KEY,
  trace_id TEXT NOT NULL,
  user_id UUID NULL,
  coach_id TEXT NULL,
  stage TEXT NOT NULL,
  handler_name TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('OK','RUNNING','ERROR')),
  latency_ms INTEGER NULL,
  payload_json JSONB NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) RLS & Policies
ALTER TABLE public.orchestrator_traces ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='orchestrator_traces' AND policyname='Traces insert by authenticated'
  ) THEN
    DROP POLICY "Traces insert by authenticated" ON public.orchestrator_traces;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='orchestrator_traces' AND policyname='Traces view by admins'
  ) THEN
    DROP POLICY "Traces view by admins" ON public.orchestrator_traces;
  END IF;
END $$;

CREATE POLICY "Traces insert by authenticated"
ON public.orchestrator_traces
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Traces view by admins"
ON public.orchestrator_traces
FOR SELECT
USING (public.has_admin_access(auth.uid()));

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_orch_traces_trace_id ON public.orchestrator_traces(trace_id);
CREATE INDEX IF NOT EXISTS idx_orch_traces_created_at ON public.orchestrator_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orch_traces_stage ON public.orchestrator_traces(stage);
CREATE INDEX IF NOT EXISTS idx_orch_traces_status ON public.orchestrator_traces(status);
CREATE INDEX IF NOT EXISTS idx_orch_traces_user_id ON public.orchestrator_traces(user_id);
CREATE INDEX IF NOT EXISTS idx_orch_traces_coach_id ON public.orchestrator_traces(coach_id);

-- 4) Realtime enablement
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

-- 5) Views
CREATE OR REPLACE VIEW public.v_orchestrator_traces_recent AS
  SELECT *
  FROM public.orchestrator_traces
  WHERE created_at >= now() - interval '60 minutes';

CREATE OR REPLACE VIEW public.v_orchestrator_traces_open_errors AS
WITH latest AS (
  SELECT DISTINCT ON (trace_id) *
  FROM public.orchestrator_traces
  ORDER BY trace_id, created_at DESC
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
WHERE created_at >= now() - interval '60 minutes'
GROUP BY stage;