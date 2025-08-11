-- Enforce immutability of date and uniqueness per user/day for body_measurements
-- Reuse existing function (CREATE OR REPLACE ensures idempotency)
CREATE OR REPLACE FUNCTION public.prevent_body_measurements_date_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  -- Falls jemand versucht, das Datum zu ändern, setzen wir es auf den alten Wert zurück
  if new.date is distinct from old.date then
    new.date := old.date;
  end if;
  return new;
end;
$$;

-- Recreate trigger safely
DROP TRIGGER IF EXISTS trg_prevent_bm_date_change ON public.body_measurements;
CREATE TRIGGER trg_prevent_bm_date_change
BEFORE UPDATE ON public.body_measurements
FOR EACH ROW
EXECUTE FUNCTION public.prevent_body_measurements_date_change();

-- Unique index to avoid overwriting different days
CREATE UNIQUE INDEX IF NOT EXISTS uniq_body_measurements_user_date
  ON public.body_measurements (user_id, date);
