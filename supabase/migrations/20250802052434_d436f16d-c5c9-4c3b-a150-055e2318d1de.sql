-- Drop existing function first
DROP FUNCTION IF EXISTS get_summary_range(uuid, integer);

-- Create view for rolling 30-day summary data for efficient trend charts
CREATE OR REPLACE VIEW v_summary_rolling_30 AS
SELECT
  user_id,
  date,
  (summary_struct_json -> 'kpis' -> 'nutrition' -> 'totals' ->> 'kcal')::numeric as kcal,
  (summary_struct_json -> 'kpis' -> 'training' ->> 'volume_kg')::numeric as volume_kg,
  (summary_struct_json -> 'kpis' -> 'recovery' ->> 'sleep_hours')::numeric as sleep_hours,
  (summary_struct_json -> 'kpis' -> 'recovery' ->> 'sleep_score')::numeric as sleep_score,
  (summary_struct_json -> 'kpis' -> 'hydration' ->> 'total_ml')::numeric as hydration_ml,
  (summary_struct_json -> 'kpis' -> 'hydration' ->> 'hydration_score')::numeric as hydration_score,
  (summary_struct_json -> 'kpis' -> 'supplements' ->> 'compliance_pct')::numeric as supplement_compliance,
  (summary_struct_json -> 'coaching' ->> 'sentiment') as mood,
  (summary_struct_json -> 'meta' ->> 'data_completeness_score')::numeric as completeness_score
FROM daily_summaries
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  AND summary_struct_json IS NOT NULL
ORDER BY user_id, date;

-- Create RPC function to get summary range for a user
CREATE FUNCTION get_summary_range_v2(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE(
  date date,
  kcal numeric,
  volume_kg numeric,
  sleep_hours numeric,
  sleep_score numeric,
  hydration_ml numeric,
  hydration_score numeric,
  supplement_compliance numeric,
  mood text,
  completeness_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.date,
    v.kcal,
    v.volume_kg,
    v.sleep_hours,
    v.sleep_score,
    v.hydration_ml,
    v.hydration_score,
    v.supplement_compliance,
    v.mood,
    v.completeness_score
  FROM v_summary_rolling_30 v
  WHERE v.user_id = p_user_id
    AND v.date >= CURRENT_DATE - (p_days || ' days')::interval
  ORDER BY v.date DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;