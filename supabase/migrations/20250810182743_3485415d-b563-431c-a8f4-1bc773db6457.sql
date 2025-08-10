-- P3: RLS/Policies für Telemetrie + Mini-Dashboard Views

-- 1) unmet_tool_events: RLS aktivieren und Policies setzen
alter table if exists public.unmet_tool_events enable row level security;

-- Insert: Nur eigener User
create policy p_unmet_insert_self
on public.unmet_tool_events
for insert
to authenticated
with check (auth.uid() = user_id);

-- Select: User sieht nur eigene
create policy p_unmet_select_self
on public.unmet_tool_events
for select
to authenticated
using (auth.uid() = user_id);

-- Select: Admin-Vollzugriff
create policy p_unmet_select_admin
on public.unmet_tool_events
for select
to authenticated
using (public.is_super_admin());

-- Delete: Admin Housekeeping
create policy p_unmet_delete_admin
on public.unmet_tool_events
for delete
to authenticated
using (public.is_super_admin());


-- 2) tool_lexicon optional härten (RLS sollte bereits aktiv sein)
alter table if exists public.tool_lexicon enable row level security;

-- Falls eine user_id-Spalte existiert, Self-Policies ergänzen
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='tool_lexicon' and column_name='user_id'
  ) then
    begin
      create policy p_lexicon_select_self
      on public.tool_lexicon
      for select
      to authenticated
      using (coalesce(user_id, auth.uid()) = auth.uid());
    exception when duplicate_object then null; end;

    begin
      create policy p_lexicon_insert_self
      on public.tool_lexicon
      for insert
      to authenticated
      with check (coalesce(user_id, auth.uid()) = auth.uid());
    exception when duplicate_object then null; end;
  end if;
end$$;

-- Admin-Select-Policy (redundant falls Public-Select existiert, aber unschädlich)
do $$
begin
  begin
    create policy p_lexicon_select_admin
    on public.tool_lexicon
    for select
    to authenticated
    using (public.is_super_admin());
  exception when duplicate_object then null; end;
end$$;


-- 3) Mini-Dashboard Views
-- Intent-Hitrate & Unmet-Rate (nutzt created_at für Tagesaggregation)
create or replace view public.v_unmet_tool_stats as
select
  date_trunc('day', created_at) as day,
  intent_guess,
  count(*) filter (where handled_manually) as unmet_count,
  avg(coalesce(confidence, 0)) as avg_confidence
from public.unmet_tool_events
group by 1,2
order by 1 desc, 2;

-- Letzte 200 Unmet-Events kompakt
create or replace view public.v_recent_unmet as
select
  created_at,
  user_id,
  trace_id,
  intent_guess,
  confidence,
  suggested_tool,
  source,
  left(message, 160) as msg_snippet
from public.unmet_tool_events
order by created_at desc
limit 200;