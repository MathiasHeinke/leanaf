-- Simplified augmentation for user_supplements (no DO blocks)
-- 1) Ensure columns exist
ALTER TABLE public.user_supplements
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS dose text;

-- 2) Backfill from legacy columns (assumes legacy columns exist)
UPDATE public.user_supplements
SET name = COALESCE(name, custom_name)
WHERE name IS NULL;

UPDATE public.user_supplements
SET dose = COALESCE(dose, NULLIF(dosage, ''))
WHERE dose IS NULL;

-- 3) Indexes & uniqueness
CREATE INDEX IF NOT EXISTS idx_user_supplements_user ON public.user_supplements(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_supplements_user_canonical_name
  ON public.user_supplements(user_id, canonical, name);
-- client_event_id unique index may already exist from previous migration; create if missing
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_supplements_client_event
  ON public.user_supplements(user_id, client_event_id)
  WHERE client_event_id IS NOT NULL;