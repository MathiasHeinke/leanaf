
-- 1) Schutz: Datum in body_measurements darf bei UPDATE nicht mehr verändert werden
create or replace function public.prevent_body_measurements_date_change()
returns trigger
language plpgsql
as $$
begin
  -- Falls jemand versucht, das Datum zu ändern, setzen wir es auf den alten Wert zurück
  if new.date is distinct from old.date then
    new.date := old.date;
  end if;
  return new;
end;
$$;

-- Vorherigen Trigger (falls vorhanden) entfernen und neu anlegen
drop trigger if exists trg_prevent_bm_date_change on public.body_measurements;

create trigger trg_prevent_bm_date_change
before update on public.body_measurements
for each row
execute function public.prevent_body_measurements_date_change();

-- 2) Eindeutigkeit (ein Messsatz pro Nutzer und Tag)
-- Falls schon vorhanden, passiert nichts
create unique index if not exists uniq_body_measurements_user_date
  on public.body_measurements (user_id, date);

-- Hinweis:
-- - Dieser Trigger wirkt nur auf Updates. Inserts sind weiterhin erlaubt (einzig durch den Unique-Index begrenzt).
-- - RLS/Policies sollten bereits existieren (nur eigener Datensatz). Falls nicht, bitte melden, dann ergänzen wir sie.

