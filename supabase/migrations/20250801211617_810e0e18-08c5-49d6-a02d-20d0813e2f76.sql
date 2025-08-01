-- Update fast_meal_totals function to include fiber and sugar
CREATE OR REPLACE FUNCTION public.fast_meal_totals(p_user uuid, p_d date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_object(
    'calories', coalesce(sum(calories), 0),
    'protein', coalesce(sum(protein), 0),
    'carbs', coalesce(sum(carbs), 0),
    'fats', coalesce(sum(fats), 0),
    'fiber', coalesce(sum(fiber), 0),
    'sugar', coalesce(sum(sugar), 0),
    'count', count(*),
    'quality_score_avg', coalesce(avg(quality_score), 0)
  )
  from meals
  where user_id = p_user
    and (created_at >= p_d::timestamp
         and created_at < (p_d + interval '1 day')::timestamp);
$function$