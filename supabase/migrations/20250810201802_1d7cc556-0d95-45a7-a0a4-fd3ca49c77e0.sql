-- Add client_event_id to meals and unique index for idempotency
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS client_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS meals_user_event_uidx
  ON public.meals (user_id, client_event_id)
  WHERE client_event_id IS NOT NULL;