-- Extend compute_monthly_summary to fill all metrics and upsert monthly_summaries
-- and return a structured JSON used by the UI

-- Create helper function to calculate days in month
create or replace function public.days_in_month(p_year int, p_month int)
returns int
language sql
immutable
as $$
  select extract(day from (date_trunc('month', make_date(p_year, p_month, 1)) + interval '1 month - 1 day'))::int;
$$;

-- Compute monthly summary
create or replace function public.compute_monthly_summary(
  p_user_id uuid,
  p_year int,
  p_month int,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_start date := date_trunc('month', make_date(p_year, p_month, 1))::date;
  v_month_end   date := (date_trunc('month', make_date(p_year, p_month, 1)) + interval '1 month - 1 day')::date;
  v_days_in_month int := days_in_month(p_year, p_month);

  -- Nutrition
  v_total_calories numeric := 0;
  v_total_protein  numeric := 0;
  v_total_carbs    numeric := 0;
  v_total_fats     numeric := 0;
  v_avg_calories   numeric := 0;
  v_avg_protein    numeric := 0;
  v_avg_carbs      numeric := 0;
  v_avg_fats       numeric := 0;
  v_macro_dist     jsonb := '{}'::jsonb;
  v_top_foods      jsonb := '[]'::jsonb;

  -- Training
  v_volume_total   numeric := 0;
  v_volume_avg     numeric := 0;
  v_workout_days   int := 0;
  v_rest_days      int := 0;
  v_steps_total    int := 0;
  v_steps_avg      int := 0;

  -- Hydration
  v_hydration_total numeric := 0;
  v_hydration_avg   numeric := 0;
  v_hydration_avg_score numeric := null;

  -- Sleep
  v_sleep_avg_score numeric := null;

  -- Supplements / Inputs
  v_supplements_count int := 0;
  v_inputs_count int := 0;
  v_inputs_avg_per_day numeric := 0;

  -- Compliance
  v_compliance jsonb := '{}'::jsonb;

  v_existing_id uuid;
begin
  -- Nutrition aggregation from daily_summaries
  select
    coalesce(sum(total_calories),0),
    coalesce(sum(total_protein),0),
    coalesce(sum(total_carbs),0),
    coalesce(sum(total_fats),0),
    coalesce(avg(total_calories),0),
    coalesce(avg(total_protein),0),
    coalesce(avg(total_carbs),0),
    coalesce(avg(total_fats),0),
    jsonb_build_object(
      'protein_pct', null,
      'carbs_pct', null,
      'fats_pct', null
    ),
    '[]'::jsonb
  into
    v_total_calories, v_total_protein, v_total_carbs, v_total_fats,
    v_avg_calories, v_avg_protein, v_avg_carbs, v_avg_fats,
    v_macro_dist, v_top_foods
  from daily_summaries
  where user_id = p_user_id and date between v_month_start and v_month_end;

  -- Training: volume from daily_summaries, workout days and steps from workouts
  select coalesce(sum(workout_volume),0), coalesce(avg(workout_volume),0)
  into v_volume_total, v_volume_avg
  from daily_summaries
  where user_id = p_user_id and date between v_month_start and v_month_end;

  select coalesce(count(distinct date),0)
  into v_workout_days
  from workouts
  where user_id = p_user_id and date between v_month_start and v_month_end and coalesce(did_workout, false) = true;

  select coalesce(sum(steps),0), coalesce(avg(steps)::int,0)
  into v_steps_total, v_steps_avg
  from workouts
  where user_id = p_user_id and date between v_month_start and v_month_end and steps is not null;

  v_rest_days := greatest(v_days_in_month - v_workout_days, 0);

  -- Hydration from user_fluids and hydration score from daily_summaries
  select coalesce(sum(amount_ml),0)
  into v_hydration_total
  from user_fluids
  where user_id = p_user_id and date between v_month_start and v_month_end;

  v_hydration_avg := case when v_days_in_month > 0 then round(v_hydration_total::numeric / v_days_in_month, 2) else 0 end;

  select avg(hydration_score)::numeric
  into v_hydration_avg_score
  from daily_summaries
  where user_id = p_user_id and date between v_month_start and v_month_end and hydration_score is not null;

  -- Sleep
  select avg(sleep_score)::numeric
  into v_sleep_avg_score
  from daily_summaries
  where user_id = p_user_id and date between v_month_start and v_month_end and sleep_score is not null;

  -- Supplements count (configured/added within month)
  select coalesce(count(id),0)
  into v_supplements_count
  from user_supplements
  where user_id = p_user_id and created_at::date between v_month_start and v_month_end;

  -- Inputs count: meals + workouts + fluids + supplements (created)
  select
    coalesce((select count(*) from meals m where m.user_id = p_user_id and m.date between v_month_start and v_month_end),0)
    + coalesce((select count(*) from workouts w where w.user_id = p_user_id and w.date between v_month_start and v_month_end),0)
    + coalesce((select count(*) from user_fluids f where f.user_id = p_user_id and f.date between v_month_start and v_month_end),0)
    + coalesce((select count(*) from user_supplements s where s.user_id = p_user_id and s.created_at::date between v_month_start and v_month_end),0)
  into v_inputs_count;

  v_inputs_avg_per_day := case when v_days_in_month > 0 then round(v_inputs_count::numeric / v_days_in_month, 2) else 0 end;

  -- Simple compliance heuristics
  v_compliance := jsonb_build_object(
    'nutrition_compliance_pct', least(100, greatest(0, round((case when v_avg_calories > 0 then 80 else 0 end)::numeric,0))),
    'workout_compliance_pct', least(100, round((v_workout_days::numeric / nullif(v_days_in_month,0)) * 100, 0)),
    'hydration_compliance_pct', coalesce(round(v_hydration_avg_score,0), 0)
  );

  -- Upsert into monthly_summaries
  select id into v_existing_id from monthly_summaries
   where user_id = p_user_id and year = p_year and month = p_month limit 1;

  if v_existing_id is null then
    insert into monthly_summaries (
      id, user_id, year, month,
      total_calories, total_protein, total_carbs, total_fats,
      avg_calories_per_day, avg_protein_per_day, avg_carbs_per_day, avg_fats_per_day,
      workout_volume_total, workout_volume_avg,
      hydration_total_ml, hydration_avg_ml, hydration_avg_score,
      sleep_avg_score,
      macro_distribution_month, top_foods_month,
      steps_total, steps_avg, workouts_count, rest_days,
      supplements_count, inputs_count, inputs_avg_per_day,
      compliance_metrics, created_at, updated_at
    ) values (
      gen_random_uuid(), p_user_id, p_year, p_month,
      v_total_calories, v_total_protein, v_total_carbs, v_total_fats,
      v_avg_calories, v_avg_protein, v_avg_carbs, v_avg_fats,
      v_volume_total, v_volume_avg,
      v_hydration_total, v_hydration_avg, v_hydration_avg_score,
      v_sleep_avg_score,
      v_macro_dist, v_top_foods,
      v_steps_total, v_steps_avg, v_workout_days, v_rest_days,
      v_supplements_count, v_inputs_count, v_inputs_avg_per_day,
      v_compliance, now(), now()
    );
  else
    update monthly_summaries set
      total_calories = v_total_calories,
      total_protein = v_total_protein,
      total_carbs = v_total_carbs,
      total_fats = v_total_fats,
      avg_calories_per_day = v_avg_calories,
      avg_protein_per_day = v_avg_protein,
      avg_carbs_per_day = v_avg_carbs,
      avg_fats_per_day = v_avg_fats,
      workout_volume_total = v_volume_total,
      workout_volume_avg = v_volume_avg,
      hydration_total_ml = v_hydration_total,
      hydration_avg_ml = v_hydration_avg,
      hydration_avg_score = v_hydration_avg_score,
      sleep_avg_score = v_sleep_avg_score,
      macro_distribution_month = v_macro_dist,
      top_foods_month = v_top_foods,
      steps_total = v_steps_total,
      steps_avg = v_steps_avg,
      workouts_count = v_workout_days,
      rest_days = v_rest_days,
      supplements_count = v_supplements_count,
      inputs_count = v_inputs_count,
      inputs_avg_per_day = v_inputs_avg_per_day,
      compliance_metrics = v_compliance,
      updated_at = now()
    where id = v_existing_id;
  end if;

  return jsonb_build_object(
    'period', jsonb_build_object(
      'year', p_year,
      'month', p_month,
      'start_date', v_month_start::text,
      'end_date', v_month_end::text,
      'days_in_month', v_days_in_month
    ),
    'nutrition', jsonb_build_object(
      'total_calories', coalesce(v_total_calories,0),
      'avg_calories', coalesce(v_avg_calories,0),
      'total_protein', coalesce(v_total_protein,0),
      'avg_protein', coalesce(v_avg_protein,0)
    ),
    'training', jsonb_build_object(
      'total_volume_kg', coalesce(v_volume_total,0),
      'workout_days', coalesce(v_workout_days,0)
    ),
    'hydration', jsonb_build_object(
      'total_ml', coalesce(v_hydration_total,0),
      'avg_ml', coalesce(v_hydration_avg,0)
    ),
    'compliance', v_compliance
  );
end;
$$;
