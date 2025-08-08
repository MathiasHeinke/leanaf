-- Bring feature_flags into a state where we can upsert macroBars regardless of legacy columns
ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS key text,
  ADD COLUMN IF NOT EXISTS enabled_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rollout_percentage int2 NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='feature_flags_key_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX feature_flags_key_unique ON public.feature_flags(key)';
  END IF;
END $$;

-- Upsert macroBars while supporting optional flag_name column
DO $$
DECLARE has_flag_name boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='feature_flags' AND column_name='flag_name'
  ) INTO has_flag_name;

  IF has_flag_name THEN
    INSERT INTO public.feature_flags (key, flag_name, enabled_default, rollout_percentage)
    VALUES ('macroBars', 'macroBars', false, 0)
    ON CONFLICT (key) DO UPDATE SET 
      flag_name = EXCLUDED.flag_name,
      updated_at = now();
  ELSE
    INSERT INTO public.feature_flags (key, enabled_default, rollout_percentage)
    VALUES ('macroBars', false, 0)
    ON CONFLICT (key) DO UPDATE SET updated_at = now();
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();