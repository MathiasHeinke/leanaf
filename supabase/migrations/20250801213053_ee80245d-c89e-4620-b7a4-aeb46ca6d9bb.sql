-- Create missing fast_fluid_totals function
CREATE OR REPLACE FUNCTION public.fast_fluid_totals(p_user uuid, p_d date)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(sum(amount_ml), 0)
  from user_fluids
  where user_id = p_user
    and (consumed_at >= p_d::timestamp
         and consumed_at < (p_d + interval '1 day')::timestamp);
$function$;