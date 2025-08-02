-- Phase 1: SQL-Erweiterungen

-- 1-a Spalte "hydration_score" nachrüsten, falls noch nicht da
ALTER TABLE IF EXISTS daily_summaries
  ADD COLUMN IF NOT EXISTS hydration_score NUMERIC;

-- 1-b View rolling_daily_snapshot (kompakt, nur genutzte Felder)
CREATE OR REPLACE VIEW public.rolling_daily_snapshot AS
SELECT
  user_id,
  date,
  total_calories AS kcal,
  total_protein AS protein_g,
  workout_volume AS volume_kg,
  sleep_score,
  hydration_score,
  (summary_struct_json -> 'body' ->> 'weight_kg')::NUMERIC AS weight,
  (summary_struct_json -> 'hydration' ->> 'total_ml')::NUMERIC AS fluids_ml
FROM daily_summaries
WHERE summary_struct_json IS NOT NULL;

-- Grant permissions on the view
GRANT SELECT ON public.rolling_daily_snapshot TO anon, authenticated;

-- 1-c RPC get_summary_range(user,days) (liefert JSON-Array)
CREATE OR REPLACE FUNCTION public.get_summary_range(
  p_user UUID,
  p_days INT DEFAULT 14
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_agg(s ORDER BY date DESC)
    FROM (
      SELECT *
      FROM public.rolling_daily_snapshot
      WHERE user_id = p_user
        AND date >= CURRENT_DATE - (p_days::TEXT||' days')::INTERVAL
      ORDER BY date DESC
    ) s
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_summary_range(UUID,INT) TO anon, authenticated;

-- RLS-Policies für sichere Coach-Zugriffe (View nutzt daily_summaries policies)
-- Keine zusätzlichen Policies nötig, da View auf daily_summaries basiert