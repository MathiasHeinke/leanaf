-- Create simplified daily overview view
CREATE OR REPLACE VIEW v_daily_overview AS
WITH user_dates AS (
  SELECT DISTINCT 
    u.id as user_id,
    generate_series(
      CURRENT_DATE - INTERVAL '30 days',
      CURRENT_DATE,
      '1 day'::interval
    )::date as date
  FROM auth.users u
),
meal_data AS (
  SELECT 
    user_id,
    date,
    SUM(calories) as total_calories,
    SUM(protein) as total_protein,
    SUM(carbs) as total_carbs,
    SUM(fats) as total_fats
  FROM meals
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY user_id, date
),
workout_data AS (
  SELECT 
    sess.user_id,
    sess.date,
    AVG(sess.overall_rpe) as avg_rpe,
    SUM(
      CASE 
        WHEN es.weight_kg IS NOT NULL AND es.reps IS NOT NULL 
        THEN es.weight_kg * es.reps 
        ELSE 0 
      END
    ) as total_volume_kg
  FROM exercise_sessions sess
  LEFT JOIN exercise_sets es ON sess.id = es.session_id
  WHERE sess.date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY sess.user_id, sess.date
),
sleep_data AS (
  SELECT 
    user_id,
    date,
    CASE 
      WHEN sleep_hours >= 8 THEN 100
      WHEN sleep_hours >= 7 THEN 80
      WHEN sleep_hours >= 6 THEN 60
      ELSE 40
    END as sleep_score
  FROM sleep_tracking
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
),
fluid_data AS (
  SELECT 
    user_id,
    date,
    SUM(amount_ml) as total_fluid_ml
  FROM fluid_intake
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY user_id, date
),
weight_data AS (
  SELECT DISTINCT ON (user_id, date)
    user_id,
    date,
    weight_kg
  FROM weight_history
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY user_id, date, created_at DESC
),
body_data AS (
  SELECT DISTINCT ON (user_id, date)
    user_id,
    date,
    chest,
    waist,
    belly
  FROM body_measurements
  WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY user_id, date, created_at DESC
)
SELECT 
  ud.user_id,
  ud.date,
  COALESCE(m.total_calories, 0) as kcal,
  COALESCE(m.total_protein, 0) as protein_g,
  COALESCE(m.total_carbs, 0) as carbs_g,
  COALESCE(m.total_fats, 0) as fats_g,
  w.avg_rpe as rpe_avg,
  w.total_volume_kg as volume_kg,
  s.sleep_score,
  f.total_fluid_ml as fluid_ml,
  wh.weight_kg,
  bm.chest,
  bm.waist,
  bm.belly
FROM user_dates ud
LEFT JOIN meal_data m ON ud.user_id = m.user_id AND ud.date = m.date
LEFT JOIN workout_data w ON ud.user_id = w.user_id AND ud.date = w.date
LEFT JOIN sleep_data s ON ud.user_id = s.user_id AND ud.date = s.date
LEFT JOIN fluid_data f ON ud.user_id = f.user_id AND ud.date = f.date
LEFT JOIN weight_data wh ON ud.user_id = wh.user_id AND ud.date = wh.date
LEFT JOIN body_data bm ON ud.user_id = bm.user_id AND ud.date = bm.date;

-- Grant access to view
GRANT SELECT ON v_daily_overview TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Users can view their own daily overview" ON v_daily_overview
FOR SELECT USING (auth.uid() = user_id);