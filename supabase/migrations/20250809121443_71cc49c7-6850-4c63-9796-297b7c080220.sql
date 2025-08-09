-- Create or replace view for today's meals including first image URL
create or replace view public.v_today_meals as
select
  m.id,
  m.user_id,
  m.created_at as ts,
  m.title,
  m.calories as kcal,
  m.protein,
  m.carbs,
  m.fats as fat,
  m.quality_score,
  mi.url as image_url
from public.meals m
left join lateral (
  select url
  from public.meal_images i
  where i.meal_id = m.id
  order by i.position nulls last, i.created_at asc
  limit 1
) mi on true
where (m.created_at at time zone 'UTC' at time zone 'Europe/Berlin')::date = current_date;

-- Indexes to optimize lookups
create index if not exists idx_meal_images_meal_position on public.meal_images (meal_id, position, created_at);
create index if not exists idx_meals_created_at on public.meals (created_at);

-- Optional: TZ-safe view for today's fluids
create or replace view public.v_today_fluids as
select
  f.user_id,
  (now() at time zone 'Europe/Berlin')::date as date_key,
  coalesce(sum(f.amount_ml), 0)::int as today_ml
from public.user_fluids f
where (f.consumed_at at time zone 'UTC' at time zone 'Europe/Berlin')::date = current_date
group by 1;