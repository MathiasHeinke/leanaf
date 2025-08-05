-- Phase 1: Backfill existing coach_traces with utilization_percent for token budget metrics
UPDATE coach_traces 
SET data = data || jsonb_build_object(
  'utilization_percent', 
  CASE 
    WHEN (data->>'prompt_tokens')::numeric > 0 AND (data->>'budgetLimit')::numeric > 0 THEN
      ROUND(((data->>'prompt_tokens')::numeric / (data->>'budgetLimit')::numeric) * 100)
    WHEN (data->>'prompt_tokens')::numeric > 0 THEN
      ROUND(((data->>'prompt_tokens')::numeric / 6000.0) * 100) -- Default budget limit
    ELSE 0
  END,
  'budgetLimit', 
  COALESCE((data->>'budgetLimit')::numeric, 6000) -- Set default budget limit
)
WHERE (data ? 'prompt_tokens' OR data ? 'actualTokens') 
  AND (data->>'utilization_percent') IS NULL;

-- Phase 2: Add some sample token budget data for testing the dashboard
INSERT INTO coach_traces (trace_id, ts, stage, data)
SELECT 
  'token-test-' || generate_random_uuid()::text,
  now() - (interval '1 hour' * random() * 24), -- Random times in last 24 hours
  'token_budget_check',
  jsonb_build_object(
    'prompt_tokens', 1000 + (random() * 4000)::int, -- Random between 1000-5000 tokens
    'budgetLimit', 6000,
    'utilization_percent', (((1000 + (random() * 4000)::int) / 6000.0) * 100)::int,
    'actualTokens', 1000 + (random() * 4000)::int,
    'needsTrimming', random() > 0.8 -- 20% chance of trimming needed
  )
FROM generate_series(1, 50); -- Generate 50 sample entries