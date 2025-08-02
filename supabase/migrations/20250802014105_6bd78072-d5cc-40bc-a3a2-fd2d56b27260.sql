-- ❷ RPC-Funktionen: Schnelle Aggregationen
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