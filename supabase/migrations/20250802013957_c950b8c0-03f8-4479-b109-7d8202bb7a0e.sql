-- ❶ Schema-Upgrade: Neue Felder + Indexe  
ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS hydration_score integer,
  ADD COLUMN IF NOT EXISTS schema_version text DEFAULT '2025-08-v1';

CREATE INDEX IF NOT EXISTS daily_summaries_user_date
  ON daily_summaries (user_id, date);

-- Zuerst alte View droppen, dann neu erstellen
DROP VIEW IF EXISTS rolling_daily_snapshot;

CREATE VIEW rolling_daily_snapshot AS
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