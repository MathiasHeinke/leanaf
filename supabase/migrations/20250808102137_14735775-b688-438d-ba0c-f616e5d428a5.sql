-- Align feature_flags to expected schema and seed macroBars; then create meals assets

-- 0) Bring feature_flags to canonical shape
ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS key text,
  ADD COLUMN IF NOT EXISTS enabled_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rollout_percentage int2 NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure uniqueness on key for upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='feature_flags_key_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX feature_flags_key_unique ON public.feature_flags(key)';
  END IF;
END $$;

-- Upsert macroBars with requested defaults
INSERT INTO public.feature_flags (key, enabled_default, rollout_percentage)
VALUES ('macroBars', false, 0)
ON CONFLICT (key) DO UPDATE SET updated_at = now();

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1) Meals fields
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS quality_score integer;

CREATE OR REPLACE FUNCTION public.validate_meals_quality_score()
RETURNS trigger AS $$
BEGIN
  IF NEW.quality_score IS NOT NULL AND (NEW.quality_score < 1 OR NEW.quality_score > 10) THEN
    RAISE EXCEPTION 'quality_score must be between 1 and 10';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_meals_quality_score_range ON public.meals;
CREATE TRIGGER validate_meals_quality_score_range
BEFORE INSERT OR UPDATE ON public.meals
FOR EACH ROW EXECUTE FUNCTION public.validate_meals_quality_score();

ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS ts timestamptz;
UPDATE public.meals SET ts = created_at WHERE ts IS NULL;

CREATE OR REPLACE FUNCTION public.set_meals_ts()
RETURNS trigger AS $$
BEGIN
  NEW.ts := COALESCE(NEW.ts, NEW.created_at);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_meals_ts_before_insupd ON public.meals;
CREATE TRIGGER set_meals_ts_before_insupd
BEFORE INSERT OR UPDATE ON public.meals
FOR EACH ROW EXECUTE FUNCTION public.set_meals_ts();

-- 2) meal_images table + RLS
CREATE TABLE IF NOT EXISTS public.meal_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  url text NOT NULL,
  thumb_url text,
  storage_path text,
  position integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their meal images" ON public.meal_images;
CREATE POLICY "Users can manage their meal images" ON public.meal_images
FOR ALL
USING (EXISTS (SELECT 1 FROM public.meals m WHERE m.id = meal_images.meal_id AND m.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.meals m WHERE m.id = meal_images.meal_id AND m.user_id = auth.uid()))
;

DROP TRIGGER IF EXISTS update_meal_images_updated_at ON public.meal_images;
CREATE TRIGGER update_meal_images_updated_at
BEFORE UPDATE ON public.meal_images
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_meal_images_meal_id ON public.meal_images(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_images_created_at ON public.meal_images(created_at);

-- 3) v_today_meals
CREATE OR REPLACE VIEW public.v_today_meals AS
SELECT 
  id,
  user_id,
  created_at AS ts,
  title,
  calories AS kcal,
  protein,
  carbs,
  fats AS fat,
  quality_score
FROM public.meals
WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')::date = CURRENT_DATE;