
begin;

-- 1) Global aktivieren: feature_plus_dashboard auf 100% Rollout setzen (idempotent)
update public.feature_flags
set is_enabled = true,
    rollout_percentage = 100
where flag_name = 'feature_plus_dashboard';

-- 2) Falls der Flag-Eintrag noch nicht existiert: anlegen
insert into public.feature_flags (flag_name, is_enabled, rollout_percentage)
select 'feature_plus_dashboard', true, 100
where not exists (
  select 1 from public.feature_flags where flag_name = 'feature_plus_dashboard'
);

commit;
