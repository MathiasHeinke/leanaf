-- Safe, idempotent migration for Momentum 2.0 data alignment

-- 1) Ensure meals has required fields
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS quality_score integer;

-- Add simple validation via trigger rather than CHECK to avoid restore issues
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_schema='public' AND event_object_table='meals' AND trigger_name='validate_meals_quality_score_range'
  ) THEN
    CREATE OR REPLACE FUNCTION public.validate_meals_quality_score()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.quality_score IS NOT NULL AND (NEW.quality_score < 1 OR NEW.quality_score > 10) THEN
        RAISE EXCEPTION 'quality_score must be between 1 and 10';
      END IF;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql;

    CREATE TRIGGER validate_meals_quality_score_range
    BEFORE INSERT OR UPDATE ON public.meals
    FOR EACH ROW EXECUTE FUNCTION public.validate_meals_quality_score();
  END IF;
END $$;

-- ts convenience column referencing created_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'meals' AND column_name = 'ts'
  ) THEN
    ALTER TABLE public.meals ADD COLUMN ts timestamptz;
    -- Backfill existing rows
    UPDATE public.meals SET ts = created_at WHERE ts IS NULL;
    -- Maintain via trigger
    CREATE OR REPLACE FUNCTION public.set_meals_ts()
    RETURNS trigger AS $$
    BEGIN
      NEW.ts := COALESCE(NEW.ts, NEW.created_at);
      RETURN NEW;
    END; $$ LANGUAGE plpgsql;

    CREATE TRIGGER set_meals_ts_before_insupd
    BEFORE INSERT OR UPDATE ON public.meals
    FOR EACH ROW EXECUTE FUNCTION public.set_meals_ts();
  END IF;
END $$;

-- 2) Meal images table + RLS
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='meal_images' AND policyname='Users can manage their meal images'
  ) THEN
    CREATE POLICY "Users can manage their meal images" ON public.meal_images
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.meals m WHERE m.id = meal_images.meal_id AND m.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.meals m WHERE m.id = meal_images.meal_id AND m.user_id = auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_schema='public' AND event_object_table='meal_images' AND trigger_name='update_meal_images_updated_at'
  ) THEN
    CREATE TRIGGER update_meal_images_updated_at
    BEFORE UPDATE ON public.meal_images
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meal_images_meal_id ON public.meal_images(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_images_created_at ON public.meal_images(created_at);

-- 3) Today meals view (Berlin tz like project conventions)
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

-- 4) Feature flag: macroBars (table already exists per user spec)
INSERT INTO public.feature_flags (key, enabled_default, rollout_percentage)
VALUES ('macroBars', false, 0)
ON CONFLICT (key) DO UPDATE SET updated_at = now();

-- Optional: keep updated_at fresh automatically
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_schema='public' AND event_object_table='feature_flags' AND trigger_name='update_feature_flags_updated_at'
  ) THEN
    CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;