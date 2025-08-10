-- P7-Prep: KPI view for last 24 hours
CREATE OR REPLACE VIEW public.v_trace_kpis_24h AS
SELECT
  handler_name,
  COUNT(*) AS calls,
  AVG(latency_ms) FILTER (WHERE stage IN ('tool_result','reply_send') AND latency_ms IS NOT NULL) AS avg_latency_ms,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY latency_ms) FILTER (WHERE stage IN ('tool_result','reply_send') AND latency_ms IS NOT NULL) AS p90_latency_ms,
  SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) AS errors,
  (SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0)) AS error_rate
FROM public.orchestrator_traces
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY handler_name
ORDER BY calls DESC;