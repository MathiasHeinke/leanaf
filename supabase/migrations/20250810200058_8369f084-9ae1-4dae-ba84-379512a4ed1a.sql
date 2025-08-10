-- Add client_event_id to meals and unique index for idempotency
alter table public.meals
  add column if not exists client_event_id text;

create unique index if not exists meals_user_event_uidx
  on public.meals (user_id, client_event_id)
  where client_event_id is not null;