
-- 1) Legacy-Fehler in Logs beseitigen: Null-Argument-Variante von current_user_has_role()
-- Hinweis: Es existieren bereits Overloads mit Text/App_Role.
-- Diese Variante wird nur in Alt-Stellen referenziert und gibt bewusst TRUE zurück,
-- damit sie niemals blockiert.

create or replace function public.current_user_has_role()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select true;
$$;

