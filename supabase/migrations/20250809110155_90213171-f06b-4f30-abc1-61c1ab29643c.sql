-- Create compatibility view placeholder for Momentum meals (empty by default)
CREATE OR REPLACE VIEW public.v_momentum_meals_compat AS
SELECT 
  NULL::uuid       AS id,
  NULL::uuid       AS user_id,
  NULL::timestamptz AS ts,
  NULL::text       AS title,
  NULL::numeric    AS kcal,
  NULL::numeric    AS protein,
  NULL::numeric    AS carbs,
  NULL::numeric    AS fat,
  NULL::integer    AS quality_score,
  NULL::text       AS image_url
WHERE FALSE;

-- Create union view for today's meals using Berlin timezone
CREATE OR REPLACE VIEW public.v_today_meals_union AS
SELECT id, user_id, ts, kcal, protein, carbs, fat, quality_score, title
FROM public.v_today_meals
WHERE (ts AT TIME ZONE 'Europe/Berlin')::date = (now() AT TIME ZONE 'Europe/Berlin')::date
UNION ALL
SELECT id, user_id, ts, kcal, protein, carbs, fat, quality_score, title
FROM public.v_momentum_meals_compat
WHERE (ts AT TIME ZONE 'Europe/Berlin')::date = (now() AT TIME ZONE 'Europe/Berlin')::date;

-- Create view for today's fluid totals (Berlin timezone)
CREATE OR REPLACE VIEW public.v_today_fluids AS
SELECT 
  uf.user_id,
  (now() AT TIME ZONE 'Europe/Berlin')::date AS date_key,
  COALESCE(SUM(uf.amount_ml), 0)::int AS today_ml
FROM public.user_fluids uf
WHERE 
  (COALESCE(uf.consumed_at, uf.created_at) AT TIME ZONE 'Europe/Berlin')::date = (now() AT TIME ZONE 'Europe/Berlin')::date
  OR uf.date = (now() AT TIME ZONE 'Europe/Berlin')::date
GROUP BY uf.user_id;