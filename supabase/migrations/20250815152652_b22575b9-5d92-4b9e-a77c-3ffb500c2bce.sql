
-- 1) Auth-Debug-Logs-Tabelle
create table if not exists public.auth_debug_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_time timestamptz not null default now(),
  event text not null,                  -- z.B. INIT, SIGNED_IN, TOKEN_REFRESHED, REDIRECT_DECISION
  stage text,                           -- z.B. "onAuthStateChange", "initAuth"
  pathname text,                        -- aktueller Pfad
  from_path text,
  to_path text,
  is_preview_mode boolean,
  has_user boolean,
  has_session boolean,
  has_access_token boolean,
  auth_event text,                      -- rohes Supabase-Event: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
  session_user_id uuid,
  details jsonb default '{}'::jsonb,    -- beliebige Zusatzinfos
  trace_id text,                        -- korreliert alle Events eines Login-Flows
  client_ts timestamptz,                -- vom Client gemeldeter Zeitpunkt
  user_agent text,
  ip text
);

alter table public.auth_debug_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'auth_debug_logs' and policyname = 'Users can insert their own auth logs'
  ) then
    create policy "Users can insert their own auth logs"
      on public.auth_debug_logs
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'auth_debug_logs' and policyname = 'Users can view their own auth logs'
  ) then
    create policy "Users can view their own auth logs"
      on public.auth_debug_logs
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists auth_debug_logs_user_time_idx on public.auth_debug_logs (user_id, event_time desc);
create index if not exists auth_debug_logs_trace_idx on public.auth_debug_logs (trace_id);

-- 2) Fehlende RPC-Funktion absichern (Text-Signatur)
create or replace function public.current_user_has_role(_role text)
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  -- Lean: aktuell kein Rollenmodell notwendig
  select false;
$$;
