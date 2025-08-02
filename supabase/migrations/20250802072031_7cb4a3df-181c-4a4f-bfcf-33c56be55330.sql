-- Create workout plan drafts table for 2-step plan creation
create table workout_plan_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  goal text,
  days_per_wk integer,
  notes text,
  structure_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table workout_plan_drafts enable row level security;

-- RLS policies - users can only access their own drafts
create policy "Users can view their own workout plan drafts"
  on workout_plan_drafts for select
  using (auth.uid() = user_id);

create policy "Users can create their own workout plan drafts"
  on workout_plan_drafts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own workout plan drafts"
  on workout_plan_drafts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own workout plan drafts"
  on workout_plan_drafts for delete
  using (auth.uid() = user_id);

-- Add updated_at trigger
create trigger update_workout_plan_drafts_updated_at
  before update on workout_plan_drafts
  for each row
  execute function update_updated_at_column();