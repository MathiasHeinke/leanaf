-- Ensure shadow_state table exists with proper structure
create table if not exists shadow_state (
  user_id uuid not null,
  trace_id text not null primary key,
  meta jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Create index for cleanup operations
create index if not exists shadow_state_expires_idx on shadow_state (expires_at);

-- Create index for user queries
create index if not exists shadow_state_user_expires_idx on shadow_state (user_id, expires_at);

-- Enable RLS
alter table shadow_state enable row level security;

-- RLS policies
create policy "Users can manage their own shadow state"
on shadow_state
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "System can manage shadow state"
on shadow_state
for all
using (
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role')::text = 'service_role'
);