-- Update v_today_meals to use Europe/Berlin with 03:00 cutoff and robust title mapping
CREATE OR REPLACE VIEW public.v_today_meals AS
SELECT
  m.id,
  m.user_id,
  m.created_at AS ts,
  COALESCE(m.title, m.text) AS title,
  m.calories AS kcal,
  m.protein,
  m.carbs,
  m.fats AS fat,
  m.quality_score
FROM public.meals m
WHERE (
  ((m.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin') - INTERVAL '3 hours')::date
) = (
  ((now() AT TIME ZONE 'Europe/Berlin') - INTERVAL '3 hours')::date
);
