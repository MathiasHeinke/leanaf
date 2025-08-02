-- ❶ Schema-Upgrade: Neue Felder + Indexe
ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS hydration_score integer,
  ADD COLUMN IF NOT EXISTS schema_version text DEFAULT '2025-08-v1';

CREATE INDEX IF NOT EXISTS daily_summaries_user_date
  ON daily_summaries (user_id, date);

-- View für rolling snapshots (letzte 30 d)
CREATE OR REPLACE VIEW rolling_daily_snapshot AS
SELECT
  user_id,
  date,
  total_calories,
  total_protein,
  workout_volume,
  sleep_score,
  hydration_score,
  (summary_struct_json -> 'body' ->> 'weight_kg')::numeric as weight
FROM daily_summaries
WHERE date > current_date - interval '31 days';

-- �② RPC-Funktionen: Schnelle Aggregationen
CREATE OR REPLACE FUNCTION fast_meal_totals(p_user uuid, p_d date)
RETURNS TABLE(calories numeric, protein numeric, carbs numeric, fats numeric) AS $$
  SELECT COALESCE(SUM(calories),0),
         COALESCE(SUM(protein),0),
         COALESCE(SUM(carbs),0),
         COALESCE(SUM(fats),0)
    FROM meals
   WHERE user_id = p_user
     AND (date = p_d OR created_at::date = p_d);
$$ LANGUAGE sql STABLE;

-- Volumen aus exercise_sets (1 Tag)
CREATE OR REPLACE FUNCTION fast_sets_volume(p_user uuid, p_d date)
RETURNS numeric AS $$
  SELECT COALESCE(SUM(reps * weight_kg), 0)
  FROM exercise_sets
  WHERE user_id = p_user
    AND created_at::date = p_d;
$$ LANGUAGE sql STABLE;

-- Fluids-Totals (1 Tag)  
CREATE OR REPLACE FUNCTION fast_fluid_totals(p_user uuid, p_d date)
RETURNS numeric AS $$
  SELECT COALESCE(SUM(amount_ml), 0)
  FROM user_fluids
  WHERE user_id = p_user
    AND (date = p_d OR consumed_at::date = p_d);
$$ LANGUAGE sql STABLE;

-- Summary-Range (14–30 d) – für Trend-Charts
CREATE OR REPLACE FUNCTION get_summary_range(p_user uuid, p_days int DEFAULT 30)
RETURNS SETOF daily_summaries AS $$
  SELECT *
    FROM daily_summaries
   WHERE user_id = p_user
     AND date > current_date - (p_days||' days')::interval
   ORDER BY date DESC;
$$ LANGUAGE sql STABLE;