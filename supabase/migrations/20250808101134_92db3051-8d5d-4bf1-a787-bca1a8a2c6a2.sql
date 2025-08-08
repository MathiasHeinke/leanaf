--- Meals alignment: add missing fields and view for Today
-- 1) Add columns to meals if missing
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS quality_score integer CHECK (quality_score BETWEEN 1 AND 10);

-- ts column aligned with created_at (generated for consistent semantics)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'meals' AND column_name = 'ts'
  ) THEN
    ALTER TABLE public.meals 
      ADD COLUMN ts timestamptz GENERATED ALWAYS AS (created_at) STORED;
  END IF;
END $$;

-- 2) Meal images table
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

-- RLS for meal_images
ALTER TABLE public.meal_images ENABLE ROW LEVEL SECURITY;

-- Policy: users manage their own meal images via meals.user_id ownership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'meal_images' AND policyname = 'Users can manage their meal images'
  ) THEN
    CREATE POLICY "Users can manage their meal images"
    ON public.meal_images
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.meals m 
        WHERE m.id = meal_images.meal_id AND m.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.meals m 
        WHERE m.id = meal_images.meal_id AND m.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Trigger to maintain updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_schema = 'public' AND event_object_table = 'meal_images' AND trigger_name = 'update_meal_images_updated_at'
  ) THEN
    CREATE TRIGGER update_meal_images_updated_at
    BEFORE UPDATE ON public.meal_images
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_meal_images_meal_id ON public.meal_images(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_images_created_at ON public.meal_images(created_at);

-- 3) Today meals view (local timezone aware using Berlin as standard in project fns)
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

-- 4) Feature flag registry (aligns with existing user_feature_flags via feature_flag_id)
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  description text,
  enabled_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Read access for everyone; manage by admins (matches existing helper is_admin_by_email())
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'feature_flags' AND policyname = 'Feature flags are viewable by everyone'
  ) THEN
    CREATE POLICY "Feature flags are viewable by everyone"
    ON public.feature_flags
    FOR SELECT
    USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'feature_flags' AND policyname = 'Admins can manage feature flags'
  ) THEN
    CREATE POLICY "Admins can manage feature flags"
    ON public.feature_flags
    FOR ALL
    USING (is_admin_by_email())
    WITH CHECK (is_admin_by_email());
  END IF;
END $$;

-- Upsert the macroBars flag for A/B test default (off by default for 50/50 via assignment layer)
INSERT INTO public.feature_flags (key, description, enabled_default)
VALUES ('macroBars', 'Enable Macro Bars layout for macros cluster (A/B rollout)', false)
ON CONFLICT (key) DO UPDATE SET updated_at = now();
