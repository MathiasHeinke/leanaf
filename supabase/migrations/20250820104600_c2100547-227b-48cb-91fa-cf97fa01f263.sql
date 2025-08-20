
-- 1) Table: ares_traces (idempotent)
create table if not exists public.ares_traces (
  trace_id text primary key,
  user_id uuid not null,
  coach_id text not null,
  status text not null default 'received',

  -- client/event inputs
  client_event_id text,
  input_text text,
  images jsonb,

  -- orchestrator enrichments
  context jsonb,
  persona jsonb,
  rag_sources jsonb,

  -- prompts & LLM I/O
  system_prompt text,
  complete_prompt text,
  llm_input jsonb,
  llm_output jsonb,

  -- misc
  duration_ms integer,
  error jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Index for user timeline lookups
create index if not exists ares_traces_user_created_idx
  on public.ares_traces (user_id, created_at desc);

-- 3) Keep updated_at fresh on updates
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_ares_traces_set_updated_at'
  ) then
    create trigger trg_ares_traces_set_updated_at
    before update on public.ares_traces
    for each row execute function public.set_updated_at();
  end if;
end$$;

-- 4) Row Level Security
alter table public.ares_traces enable row level security;

-- Clean up any prior conflicting policies (optional; ignore errors if they don't exist)
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='ares_traces' and policyname='ares_debug_read_own_by_trace') then
    drop policy "ares_debug_read_own_by_trace" on public.ares_traces;
  end if;
exception when others then
  null;
end$$;

-- Allow users to read their own trace by id only when the server-side GUC is set to true for that request
create policy "ares_debug_read_own_by_trace"
on public.ares_traces
for select
using (
  current_setting('request.jwt.claims', true) is not null
  and (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid = user_id
  and coalesce(current_setting('ares.debug_read', true), 'false') = 'true'
);

-- Note:
-- - Service role will always be able to insert/update regardless of RLS.
-- - We intentionally allow only SELECT under the GUC to power the debug panel.
