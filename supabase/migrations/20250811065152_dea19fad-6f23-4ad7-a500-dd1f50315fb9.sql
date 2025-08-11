-- Option b) schema augmentation for user_supplements
-- 1) Ensure table exists (no-op if it already exists)
CREATE TABLE IF NOT EXISTS public.user_supplements (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  canonical text NOT NULL,
  name text NOT NULL,
  dose text,
  schedule jsonb,
  notes text,
  client_event_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, canonical, name)
);

-- 2) Add columns if missing (augment existing schema used by current app)
ALTER TABLE public.user_supplements
  ADD COLUMN IF NOT EXISTS canonical text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS dose text,
  ADD COLUMN IF NOT EXISTS schedule jsonb,
  ADD COLUMN IF NOT EXISTS client_event_id text;

-- 3) Backfill new columns from legacy columns to keep UI working
--    name <- custom_name, dose <- dosage (ignore empty strings)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_supplements' AND column_name = 'custom_name'
  ) THEN
    EXECUTE $$
      UPDATE public.user_supplements
      SET name = COALESCE(name, custom_name)
      WHERE name IS NULL AND custom_name IS NOT NULL
    $$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_supplements' AND column_name = 'dosage'
  ) THEN
    EXECUTE $$
      UPDATE public.user_supplements
      SET dose = COALESCE(dose, NULLIF(dosage, ''))
      WHERE dose IS NULL AND dosage IS NOT NULL
    $$;
  END IF;
END $$;

-- 4) Idempotency and lookup indexes
CREATE INDEX IF NOT EXISTS idx_user_supplements_user ON public.user_supplements(user_id);
-- Uniqueness for (user_id, canonical, name)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_supplements_user_canonical_name
  ON public.user_supplements(user_id, canonical, name);
-- Idempotency via client_event_id when provided
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_supplements_client_event
  ON public.user_supplements(user_id, client_event_id)
  WHERE client_event_id IS NOT NULL;

-- 5) RLS and owner-only policies (create only if none exist yet)
DO $$
BEGIN
  -- Enable RLS (idempotent)
  EXECUTE 'ALTER TABLE public.user_supplements ENABLE ROW LEVEL SECURITY';

  -- Only add policies if there are none (avoid duplicates if already present)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_supplements'
  ) THEN
    EXECUTE $$CREATE POLICY "Users can view their own supplements"
      ON public.user_supplements
      FOR SELECT
      USING (auth.uid() = user_id)$$;

    EXECUTE $$CREATE POLICY "Users can insert their own supplements"
      ON public.user_supplements
      FOR INSERT
      WITH CHECK (auth.uid() = user_id)$$;

    EXECUTE $$CREATE POLICY "Users can update their own supplements"
      ON public.user_supplements
      FOR UPDATE
      USING (auth.uid() = user_id)$$;

    EXECUTE $$CREATE POLICY "Users can delete their own supplements"
      ON public.user_supplements
      FOR DELETE
      USING (auth.uid() = user_id)$$;
  END IF;
END $$;