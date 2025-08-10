-- P2: Idempotency for weight_history and diary_entries
-- Weight idempotency
ALTER TABLE IF EXISTS public.weight_history
  ADD COLUMN IF NOT EXISTS client_event_id text;
CREATE UNIQUE INDEX IF NOT EXISTS ux_weight_user_event
  ON public.weight_history(user_id, client_event_id)
  WHERE client_event_id IS NOT NULL;

-- Diary idempotency
ALTER TABLE IF EXISTS public.diary_entries
  ADD COLUMN IF NOT EXISTS client_event_id text;
CREATE UNIQUE INDEX IF NOT EXISTS ux_diary_user_event
  ON public.diary_entries(user_id, client_event_id)
  WHERE client_event_id IS NOT NULL;