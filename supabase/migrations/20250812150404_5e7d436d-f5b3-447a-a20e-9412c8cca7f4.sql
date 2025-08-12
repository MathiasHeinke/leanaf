
-- 1) Dedupliziere weekly_summaries nach (user_id, iso_year, iso_week)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, iso_year, iso_week
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn
  FROM public.weekly_summaries
)
DELETE FROM public.weekly_summaries ws
USING ranked r
WHERE ws.id = r.id
  AND r.rn > 1;

-- 2) Erstelle Unique-Index für weekly_summaries (falls nicht vorhanden)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'weekly_summaries_unique_user_year_week'
  ) THEN
    CREATE UNIQUE INDEX weekly_summaries_unique_user_year_week
      ON public.weekly_summaries(user_id, iso_year, iso_week);
  END IF;
END $$;

-- 3) Dedupliziere monthly_summaries nach (user_id, year, month)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, year, month
      ORDER BY updated_at DESC, created_at DESC
    ) AS rn
  FROM public.monthly_summaries
)
DELETE FROM public.monthly_summaries ms
USING ranked r
WHERE ms.id = r.id
  AND r.rn > 1;

-- 4) Erstelle Unique-Index für monthly_summaries (falls nicht vorhanden)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'monthly_summaries_unique_user_year_month'
  ) THEN
    CREATE UNIQUE INDEX monthly_summaries_unique_user_year_month
      ON public.monthly_summaries(user_id, year, month);
  END IF;
END $$;
