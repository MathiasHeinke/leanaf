
-- 1) User-scope Views auf SECURITY INVOKER + security_barrier drehen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_today_fluids') THEN
    EXECUTE 'ALTER VIEW public.v_today_fluids SET (security_invoker = true)';
    EXECUTE 'ALTER VIEW public.v_today_fluids SET (security_barrier = true)';
    EXECUTE 'REVOKE ALL ON public.v_today_fluids FROM PUBLIC, anon';
    EXECUTE 'GRANT SELECT ON public.v_today_fluids TO authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_momentum_meals_compat') THEN
    EXECUTE 'ALTER VIEW public.v_momentum_meals_compat SET (security_invoker = true)';
    EXECUTE 'ALTER VIEW public.v_momentum_meals_compat SET (security_barrier = true)';
    EXECUTE 'REVOKE ALL ON public.v_momentum_meals_compat FROM PUBLIC, anon';
    EXECUTE 'GRANT SELECT ON public.v_momentum_meals_compat TO authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_missing_summaries_tz') THEN
    EXECUTE 'ALTER VIEW public.v_missing_summaries_tz SET (security_invoker = true)';
    EXECUTE 'ALTER VIEW public.v_missing_summaries_tz SET (security_barrier = true)';
    EXECUTE 'REVOKE ALL ON public.v_missing_summaries_tz FROM PUBLIC, anon';
    EXECUTE 'GRANT SELECT ON public.v_missing_summaries_tz TO authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_recent_unmet') THEN
    EXECUTE 'ALTER VIEW public.v_recent_unmet SET (security_invoker = true)';
    EXECUTE 'ALTER VIEW public.v_recent_unmet SET (security_barrier = true)';
    EXECUTE 'REVOKE ALL ON public.v_recent_unmet FROM PUBLIC, anon';
    EXECUTE 'GRANT SELECT ON public.v_recent_unmet TO authenticated';
  END IF;
END $$;

-- 2) Admin/Global View hart absichern (nur Service Role konsumiert diese)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_trace_kpis_24h') THEN
    EXECUTE 'REVOKE ALL ON public.v_trace_kpis_24h FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.v_trace_kpis_24h TO service_role';
  END IF;
END $$;

-- 3) Schlanke RPC für Backend-only Zugriff auf v_trace_kpis_24h
--    (nur nötig, wenn die View existiert)
CREATE OR REPLACE FUNCTION public.get_trace_kpis_24h()
RETURNS SETOF public.v_trace_kpis_24h
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.v_trace_kpis_24h;
$$;

REVOKE ALL ON FUNCTION public.get_trace_kpis_24h() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_trace_kpis_24h() TO service_role;

-- 4) Optionale Sanity-Checks (keine Änderungen, nur Sichtprüfung; kann bei Bedarf entfernt werden)
-- a) Grants prüfen
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema='public' and table_name in
-- ('v_today_fluids','v_momentum_meals_compat','v_missing_summaries_tz','v_recent_unmet','v_trace_kpis_24h');

-- b) View-Flags prüfen (security_invoker/security_barrier)
-- select relname, reloptions
-- from pg_class
-- where relnamespace = 'public'::regnamespace
--   and relkind='v'
--   and relname in ('v_today_fluids','v_momentum_meals_compat','v_missing_summaries_tz','v_recent_unmet','v_trace_kpis_24h');
