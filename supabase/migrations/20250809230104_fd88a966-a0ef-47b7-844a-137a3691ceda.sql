
-- 1) State in Sessions
ALTER TABLE public.exercise_sessions
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Optional: Persona-Feld für spätere Auswertungen (kein Default nötig)
ALTER TABLE public.exercise_sessions
  ADD COLUMN IF NOT EXISTS coach_persona text;

-- 2) Idempotenz + Herkunft an Sets
ALTER TABLE public.exercise_sets
  ADD COLUMN IF NOT EXISTS client_event_id uuid,
  ADD COLUMN IF NOT EXISTS origin text;

-- Herkunft nur auf erlaubte Werte beschränken (NULL erlaubt, damit Alt-Daten nicht brechen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exercise_sets_origin_check'
  ) THEN
    ALTER TABLE public.exercise_sets
      ADD CONSTRAINT exercise_sets_origin_check
      CHECK (origin IS NULL OR origin IN ('manual','image','auto'));
  END IF;
END$$;

-- Idempotenz: pro User einmalig (nur wenn client_event_id gesetzt ist)
CREATE UNIQUE INDEX IF NOT EXISTS exercise_sets_client_event_unique
  ON public.exercise_sets (user_id, client_event_id)
  WHERE client_event_id IS NOT NULL;

-- 3) Performance-Indizes für typische Orchestrator-Queries
CREATE INDEX IF NOT EXISTS exercise_sets_session_id_idx ON public.exercise_sets (session_id);
CREATE INDEX IF NOT EXISTS exercise_sets_user_id_idx ON public.exercise_sets (user_id);
CREATE INDEX IF NOT EXISTS exercise_sessions_user_date_idx ON public.exercise_sessions (user_id, date DESC);
