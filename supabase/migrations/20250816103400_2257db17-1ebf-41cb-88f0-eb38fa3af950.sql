
-- 1) RLS für Meals aktivieren
alter table public.meals enable row level security;

-- 2) Bestehende Policies mit gleichen Namen idempotent ersetzen
drop policy if exists "user_can_select_own_meals" on public.meals;
drop policy if exists "admin_can_select_all_meals" on public.meals;
drop policy if exists "user_can_insert_own_meals" on public.meals;
drop policy if exists "user_can_update_own_meals" on public.meals;
drop policy if exists "user_can_delete_own_meals" on public.meals;

-- 3) SELECT: Nutzer sieht nur eigene Meals
create policy "user_can_select_own_meals"
on public.meals
for select
using (auth.uid() = user_id);

-- 4) SELECT: Admins (über admin_emails via is_super_admin()) sehen alles
create policy "admin_can_select_all_meals"
on public.meals
for select
using (public.is_super_admin());

-- 5) INSERT: Nutzer darf nur für sich selbst einfügen (Admins dürfen alles)
create policy "user_can_insert_own_meals"
on public.meals
for insert
with check (auth.uid() = user_id or public.is_super_admin());

-- 6) UPDATE: Nutzer darf nur eigene Meals updaten (Admins dürfen alles)
create policy "user_can_update_own_meals"
on public.meals
for update
using (auth.uid() = user_id or public.is_super_admin())
with check (auth.uid() = user_id or public.is_super_admin());

-- 7) DELETE: Nutzer darf nur eigene Meals löschen (Admins dürfen alles)
create policy "user_can_delete_own_meals"
on public.meals
for delete
using (auth.uid() = user_id or public.is_super_admin());
