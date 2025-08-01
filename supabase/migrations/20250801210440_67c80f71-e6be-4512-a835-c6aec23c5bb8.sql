-- ❂ 24h timeout protection for slow days
create or replace function public.fast_sets_volume(p_user uuid, p_d date)
returns numeric language sql stable as $$
  select coalesce(sum(reps * weight_kg), 0)
  from exercise_sets
  where user_id = p_user
    and (created_at >= p_d::timestamp
         and created_at < (p_d + interval '1 day')::timestamp);
$$;

-- Add helper function for fast meal aggregation (using actual columns)
create or replace function public.fast_meal_totals(p_user uuid, p_d date)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'calories', coalesce(sum(calories), 0),
    'protein', coalesce(sum(protein), 0),
    'carbs', coalesce(sum(carbs), 0),
    'fats', coalesce(sum(fats), 0),
    'count', count(*),
    'quality_score_avg', coalesce(avg(quality_score), 0)
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