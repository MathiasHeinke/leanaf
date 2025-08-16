
-- 1) Stelle sicher, dass du als Super-Admin aktiv bist
-- (Passe die E-Mail unten an, falls notwendig)
update public.admin_emails
set is_active = true, role = 'super_admin', updated_at = now()
where email = 'office@mathiasheinke.de';

insert into public.admin_emails (email, role, is_active)
select 'office@mathiasheinke.de', 'super_admin', true
where not exists (
  select 1 from public.admin_emails where email = 'office@mathiasheinke.de'
);

-- 2) has_admin_access auf is_super_admin() vereinfachen
create or replace function public.has_admin_access(user_uuid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_super_admin(user_uuid);
$$;

-- 3) Legacy-Kompatibilität: current_user_has_role(text) bleibt ein "no-op" (immer false)
-- (Falls bereits so definiert, bleibt es idempotent.)
create or replace function public.current_user_has_role(_role text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select false;
$$;
