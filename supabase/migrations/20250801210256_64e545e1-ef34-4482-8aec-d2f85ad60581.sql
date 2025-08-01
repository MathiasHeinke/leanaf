-- ❶ Secure date columns (if not already there)
do $$
declare
  t text;
begin
  foreach t in array
   ['meals','user_fluids','exercise_sets','supplement_intake_log']
  loop
    -- only create if not present
    perform 1
    from information_schema.columns
    where table_name = t and column_name = 'date';
    if not found then
      execute format('alter table %I add column date date
                      generated always as (created_at::date) stored;', t);
    end if;
  end loop;
end$$;

-- ❶ Fix timezone column reference for supplement_intake_log
-- Note: supplement_intake_log uses created_at, not taken_at
do $$
begin
  -- Check if supplement_intake_log has date column, if not add it
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'supplement_intake_log' and column_name = 'date'
  ) then
    alter table supplement_intake_log add column date date
    generated always as (created_at::date) stored;
  end if;
end$$;

-- ❂ 24h timeout protection for slow days
create or replace function public.fast_sets_volume(p_user uuid, p_d date)
returns numeric language sql stable as $$
  select coalesce(sum(reps * weight_kg), 0)
  from exercise_sets
  where user_id = p_user
    and (created_at >= p_d::timestamp
         and created_at < (p_d + interval '1 day')::timestamp);
$$;

-- Add helper function for fast meal aggregation
create or replace function public.fast_meal_totals(p_user uuid, p_d date)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'calories', coalesce(sum(calories), 0),
    'protein', coalesce(sum(protein), 0),
    'carbs', coalesce(sum(carbs), 0),
    'fats', coalesce(sum(fats), 0),
    'fiber', coalesce(sum(fiber), 0),
    'sugar', coalesce(sum(sugar), 0),
    'count', count(*)
  )
  from meals
  where user_id = p_user
    and (created_at >= p_d::timestamp
         and created_at < (p_d + interval '1 day')::timestamp);
$$;

-- Add helper function for fluid totals
create or replace function public.fast_fluid_totals(p_user uuid, p_d date)
returns numeric language sql stable as $$
  select coalesce(sum(amount_ml), 0)
  from user_fluids
  where user_id = p_user
    and (consumed_at >= p_d::timestamp
         and consumed_at < (p_d + interval '1 day')::timestamp);
$$;