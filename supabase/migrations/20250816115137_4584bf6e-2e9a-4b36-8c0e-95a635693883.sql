
-- Ensure RLS and minimal, safe policies for profiles
alter table public.profiles enable row level security;

-- Allow users to view their own profiles
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
      and tablename = 'profiles' 
      and policyname = 'Users can view their own profiles'
  ) then
    create policy "Users can view their own profiles"
      on public.profiles
      for select
      using (auth.uid() = user_id);
  end if;
end$$;

-- Allow users to create their own profile
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
      and tablename = 'profiles' 
      and policyname = 'Users can create their own profiles'
  ) then
    create policy "Users can create their own profiles"
      on public.profiles
      for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

-- Allow users to update their own profile
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
      and tablename = 'profiles' 
      and policyname = 'Users can update their own profiles'
  ) then
    create policy "Users can update their own profiles"
      on public.profiles
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

-- Helpful index for lookups by user_id
create index if not exists idx_profiles_user_id on public.profiles(user_id);

-- Tiny RPC to verify DB-side identity during debugging
create or replace function public.get_my_uid()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;
