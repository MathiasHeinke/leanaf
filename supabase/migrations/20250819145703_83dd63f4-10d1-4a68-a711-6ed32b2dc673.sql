-- 1) Tabelle anlegen oder upgraden
create table if not exists orchestrator_traces (
  id text primary key,
  user_id uuid not null,
  client_event_id text,
  status text default 'started',               -- started|assembling|complete|error
  request_payload jsonb,
  persona jsonb,
  rag_chunks jsonb,
  user_context jsonb,
  system_prompt text,
  model text,
  llm_input jsonb,
  llm_output jsonb,
  meta jsonb,
  created_at timestamptz default now()
);

-- Falls aus Alt-Schema: ID-Typ, PK und Spalten anpassen
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='orchestrator_traces' and column_name='id'
               and data_type <> 'text') then
    alter table orchestrator_traces
      alter column id type text using id::text;
  end if;
exception when others then
  -- falls PK-Index stört:
  begin
    alter table orchestrator_traces drop constraint if exists orchestrator_traces_pkey;
    alter table orchestrator_traces
      alter column id type text using id::text,
      add primary key (id);
  end;
end$$;

-- Debug-Felder sicherstellen
alter table orchestrator_traces
  add column if not exists client_event_id text,
  add column if not exists status text default 'started',
  add column if not exists request_payload jsonb,
  add column if not exists persona jsonb,
  add column if not exists rag_chunks jsonb,
  add column if not exists user_context jsonb,
  add column if not exists system_prompt text,
  add column if not exists model text,
  add column if not exists llm_input jsonb,
  add column if not exists llm_output jsonb,
  add column if not exists meta jsonb,
  add column if not exists created_at timestamptz default now();

-- 2) RLS
alter table orchestrator_traces enable row level security;

drop policy if exists traces_select on orchestrator_traces;
create policy traces_select
  on orchestrator_traces for select
  using (auth.uid() = user_id);

drop policy if exists traces_insert on orchestrator_traces;
create policy traces_insert
  on orchestrator_traces for insert
  with check (auth.uid() = user_id);

drop policy if exists traces_update on orchestrator_traces;
create policy traces_update
  on orchestrator_traces for update
  using (auth.uid() = user_id);

-- 3) Indizes
create index if not exists idx_traces_user_created on orchestrator_traces(user_id, created_at desc);
create index if not exists idx_traces_client_event on orchestrator_traces(client_event_id);