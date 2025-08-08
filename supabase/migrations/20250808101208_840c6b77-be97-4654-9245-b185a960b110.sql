-- Fix failed insert: feature_flags table exists without column "key"
-- Add column if missing and create a partial unique index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'feature_flags' AND column_name = 'key'
  ) THEN
    ALTER TABLE public.feature_flags ADD COLUMN key text;
    -- Create a unique index only on non-null keys to avoid legacy rows
    CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_key_unique 
      ON public.feature_flags(key) WHERE key IS NOT NULL;
  END IF;
END $$;

-- Upsert macroBars record using the key column
INSERT INTO public.feature_flags (key, description, enabled_default)
VALUES ('macroBars', 'Enable Macro Bars layout for macros cluster (A/B rollout)', false)
ON CONFLICT ON CONSTRAINT feature_flags_key_unique DO UPDATE SET updated_at = now();
